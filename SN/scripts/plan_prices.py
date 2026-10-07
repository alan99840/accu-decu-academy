"""Plan missing Futu unadjusted bars, including observations missed over HK holidays."""
import argparse, json
from datetime import date
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CLOSED={'提前贖回','提前到期','到期贖回','提前敲出','到期','承接股票'}

def plan(data,expected):
    symbols={u['symbol'] for t in data['trades'] for u in t['underlyings'] if u['symbol']}
    required={s:{expected} for s in symbols}
    for t in data['trades']:
        if t['status'] in CLOSED or t['rule'].get('koEnabled') is False:continue
        dates=[d for d in t['observationDates'] if t['tradeDate']<=d<=expected and (not t['maturityDate'] or d<=t['maturityDate'])]
        if t['rule'].get('mode','').startswith('每日') and dates:
            dates=[d for d in data.get('tradingDays',[]) if min(dates)<=d<=min(expected,t['maturityDate'] or expected)]
        for u in t['underlyings']:
            if u['symbol']:required[u['symbol']].update(dates)
    tasks=[]
    for s,ds in sorted(required.items()):
        existing=data['prices'].get(s,{})
        missing=[d for d in ds if not isinstance(existing.get(d,{}).get('close'),(int,float)) or existing[d]['close']<=0]
        if not missing:continue
        first=min(missing)
        for year in range(int(first[:4]),int(expected[:4])+1):
            tasks.append(dict(symbol='US.'+s,start=max(first,f'{year}-01-01'),end=min(expected,f'{year}-12-31'),
                              ktype='2',autype='0',extended_time='0',num=370))
    return dict(expectedPriceDate=expected,symbolCount=len(symbols),tasks=tasks)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--expected',required=True,type=date.fromisoformat)
    p.add_argument('--calendar',type=Path);a=p.parse_args()
    data=json.loads((ROOT/'private/dataset.json').read_text())
    if a.calendar:data['tradingDays']=sorted(set(data.get('tradingDays',[])+json.loads(a.calendar.read_text())))
    print(json.dumps(plan(data,a.expected.isoformat()),ensure_ascii=False))
