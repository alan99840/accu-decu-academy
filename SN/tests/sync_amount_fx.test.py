"""Regression checks for source notional units and reference FX quote units."""
import sys,unittest
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from sync import amount
from fetch_fx import parse_quotes

class AmountAndFxTests(unittest.TestCase):
    def test_source_notional_formats(self):
        for raw,expected in [('60mio',60000000),('1Mio',1000000),('1.23mio',1230000),('30Mio',30000000),('JPY 40,000,000',40000000),('210K',210000),('USD 200,000',200000)]:
            with self.subTest(raw=raw):self.assertEqual(amount(raw),expected)
        for raw in [None,'','待確認','1,23','USD 200,000 + JPY 10,000']:
            with self.subTest(raw=raw):self.assertIsNone(amount(raw))

    def test_quote_mid_and_per_100_units(self):
        # Explicitly synthetic quotes, never used as production prices.
        source='<table>'+''.join(f'<tr><td>test</td><td>{c}</td><td>per {n}</td><td>HKD {a}</td><td>HKD {b}</td></tr>' for c,n,a,b in [('USD',1,7.9,7.7),('CNH',1,1.2,1.0),('JPY',100,5.2,4.8)])+'</table>Last Update Time : Monday, November 9, 2026 1:31 PM'
        now=datetime(2026,11,9,14,tzinfo=ZoneInfo('Asia/Hong_Kong'))
        fx=parse_quotes(source,now)
        self.assertAlmostEqual(fx['rates']['USD'],7.8)
        self.assertAlmostEqual(fx['rates']['JPY'],0.05)
        self.assertAlmostEqual(fx['rates']['CNH'],1.1)
        self.assertEqual(fx['asOf'],'2026-11-09T13:31:00+08:00')
        with self.assertRaises(ValueError):parse_quotes(source.replace('CNH','CNY'),now)
        with self.assertRaises(ValueError):parse_quotes(source.replace('1:31 PM','3:31 PM'),now)

if __name__=='__main__':unittest.main()
