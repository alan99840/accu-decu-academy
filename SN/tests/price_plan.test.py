import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from plan_prices import plan
class PricePlanTests(unittest.TestCase):
    def test_daily_catchup_includes_intervening_sessions(self):
        d={'trades':[{'tradeDate':'2026-09-01','status':'在期','rule':{'koEnabled':True,'mode':'每日全數'},'maturityDate':'2026-12-01','observationDates':['2026-09-29'],'underlyings':[{'symbol':'A'}]}],
           'prices':{'A':{'2026-09-29':{'close':100}}},'tradingDays':['2026-09-29','2026-09-30','2026-10-01','2026-10-02']}
        tasks=plan(d,'2026-10-02')['tasks']
        self.assertEqual(tasks[0]['start'],'2026-09-30')
        self.assertEqual(tasks[0]['end'],'2026-10-02')
        self.assertEqual(tasks[0]['autype'],'0')
if __name__=='__main__':unittest.main()
