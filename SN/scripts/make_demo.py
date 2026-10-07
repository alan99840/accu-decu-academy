import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
MONITOR=ROOT/'SN/monitor' if (ROOT/'SN/monitor').exists() else ROOT/'monitor'
trades=[]
for i in range(36):
    year=2026 if i<30 else 2025
    month=i%10+1
    trade=f'{year}-{month:02d}-05'
    obs=['2026-10-06','2026-11-06'] if i%4==0 else ['2026-10-15','2026-11-16']
    trades.append(dict(id=f'demo-{i:03d}',tradeDate=trade,isin=f'DEMO-{i+1:04d}',issuer=['HSBC','BNP'][i%2],
        clientCode=f'DEMO-{i%4+1:02d}',productType=['FCN','FCN','ELN','DRAN'][i%4],currency='USD' if i%5 else 'JPY',
        amount=(100000+(i%5)*100000)*(100 if i%5==0 else 1),amountRaw='示範',coupon=.12+(i%4)*.02,ko=1.0,koRaw=100,
        ki=.65,strike=.75,tenorMonths=6,status='到期贖回' if i%7==0 else '在期',maturityDate=['2026-10-23','2026-12-21','2027-02-15'][i%3],
        observationDates=obs,underlyings=[{'raw':'NVDA UQ','symbol':'NVDA','initial':100},{'raw':'TSM UN','symbol':'TSM','initial':100}],
        source={'sheet':'虛構示範','row':i+2},issues=[],rule={'verified':True,'koEnabled':True,'mode':'離散全數','comparison':'>=',
        'scheduleVerified':True,'levelVerified':True,'source':'虛構示範條款','note':'全部條款及價格均為虛構示範'}))
d=dict(schemaVersion=1,sourceAsOf='2026-10-06',generatedAt='2026-10-07',asOf='2026-10-07',trades=trades,
 prices={'NVDA':{'2026-10-06':{'close':110}},'TSM':{'2026-10-06':{'close':105}}},
 expectedPriceDate='2026-10-06',priceSource='虛構示範行情',priceCheckedAt='2026-10-07',tradingDays=['2026-10-06'])
(MONITOR/'demo.json').write_text(json.dumps(d,ensure_ascii=False,indent=2))
