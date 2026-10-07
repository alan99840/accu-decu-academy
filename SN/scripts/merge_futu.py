"""Merge connector responses into private prices; never include credentials in the input."""
import argparse,json
from datetime import date,datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def merge(old,batch):
    expected=date.fromisoformat(batch['expectedPriceDate']).isoformat()
    old.setdefault('prices',{})
    errors=[]
    for response in batch.get('responses',[]):
        symbol=response['symbol'].removeprefix('US.')
        if response.get('ret_code')!=0:
            errors.append(symbol+'：行情請求失敗');continue
        bars=response.get('data',{}).get('kline_list',[])
        for bar in bars:
            day=datetime.strptime(str(bar['date']),'%Y%m%d').date().isoformat()
            close=bar['close']
            if day>expected or not isinstance(close,(int,float)) or close<=0:continue
            old['prices'].setdefault(symbol,{})[day]=dict(close=close,source='富途未復權日線（autype=0）',verified=False)
    if 'tradingDays' not in batch or expected not in batch['tradingDays']:
        raise ValueError('已完成交易日不在美股交易日曆內')
    old['tradingDays']=sorted(set(old.get('tradingDays',[])+batch['tradingDays']))
    for symbol in batch['requiredSymbols']:
        if not old['prices'].get(symbol.removeprefix('US.'),{}).get(expected,{}).get('close'):
            errors.append(symbol+'：缺少 '+expected+' 收盤價')
    old.update(expectedPriceDate=expected,priceCheckedAt=datetime.now(timezone.utc).isoformat(),
               priceSource='富途未復權美股日線（盤前／盤後除外，僅作預警）',priceError='；'.join(errors) or None)
    return old

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('batch',type=Path);a=p.parse_args()
    price_file=ROOT/'private/prices.json'
    old=json.loads(price_file.read_text()) if price_file.exists() else {}
    result=merge(old,json.loads(a.batch.read_text()))
    tmp=price_file.with_suffix('.tmp');tmp.write_text(json.dumps(result,ensure_ascii=False));tmp.replace(price_file)
    print(json.dumps({k:result[k] for k in ['expectedPriceDate','priceCheckedAt','priceError']},ensure_ascii=False))
