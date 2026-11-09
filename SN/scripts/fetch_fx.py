"""Latest published FX reference quotes, normalized to HKD per one currency unit."""
import argparse, html, json, re, subprocess
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

URL='https://www1.poems.com.hk/en-us/market-information-and-toolbox/exchange/exchange-rates/'
HK=ZoneInfo('Asia/Hong_Kong')

def parse_quotes(source, now=None):
    now=now or datetime.now(HK)
    stamp=re.search(r'Last Update Time\s*:\s*([^<]+)',source)
    if not stamp: raise ValueError('匯率來源沒有報價時間')
    asof=datetime.strptime(html.unescape(stamp[1]).strip(),'%A, %B %d, %Y %I:%M %p').replace(tzinfo=HK)
    if asof>now: raise ValueError('匯率報價時間晚於本機時間')
    rates={'HKD':1.0};quotes={}
    clean=lambda s:html.unescape(re.sub('<[^>]+>','',s)).strip()
    for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>',source,re.S|re.I):
        cells=[clean(c) for c in re.findall(r'<td\b[^>]*>(.*?)</td>',row,re.S|re.I)]
        if len(cells)!=5 or cells[1] not in {'USD','JPY','CNH'}:continue
        unit=re.fullmatch(r'per\s+([\d,]+)',cells[2])
        values=[re.fullmatch(r'HKD\s+([\d,.]+)',s) for s in cells[3:]]
        if not unit or not all(values):raise ValueError('匯率單位或買賣報價格式不符')
        qty=float(unit[1].replace(',',''));buy,sell=[float(v[1].replace(',',''))/qty for v in values]
        if qty<=0 or not (0<sell<=buy):raise ValueError('匯率買賣價無效')
        rates[cells[1]]=(buy+sell)/2
        quotes[cells[1]]={'clientBuyHkdPerUnit':buy,'clientSellHkdPerUnit':sell,'sourceUnits':qty}
    if set(rates)!={'HKD','USD','JPY','CNH'}:raise ValueError('缺少 USD、JPY 或 CNH 即期匯率')
    return {'base':'HKD','asOf':asof.isoformat(timespec='seconds'),'checkedAt':now.isoformat(timespec='seconds'),
            'source':'輝立證券公開外匯報價','sourceUrl':URL,'method':'買賣參考報價均值；每 1 單位外幣兌 HKD',
            'rates':rates,'quotes':quotes,'error':None}

def refresh(cache, source=None):
    try:
        if source is None:
            source=subprocess.run(['curl','--max-time','20','-fLsS',URL],capture_output=True,text=True,check=True).stdout
        fx=parse_quotes(source)
        if (datetime.now(HK)-datetime.fromisoformat(fx['asOf'])).total_seconds()>5*86400:
            raise ValueError('匯率來源超過五日未更新')
        cache.parent.mkdir(parents=True,exist_ok=True)
        cache.write_text(json.dumps(fx,ensure_ascii=False,indent=2)+'\n')
        return fx
    except Exception as exc:
        fx=json.loads(cache.read_text()) if cache.exists() else {'base':'HKD','rates':{'HKD':1},'asOf':None}
        fx['error']='即期匯率更新未完成：'+str(exc)
        return fx

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--html',type=Path);p.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'private/fx.json')
    a=p.parse_args();fx=refresh(a.output,a.html.read_text() if a.html else None)
    print(json.dumps({k:fx.get(k) for k in ['asOf','rates','error']},ensure_ascii=False))
    if fx.get('error'):raise SystemExit(1)
