import sys,unittest
from datetime import date
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hk_workday import check,load_calendar

class WorkdayTests(unittest.TestCase):
    def test_holidays_and_catchup(self):
        cal=load_calendar(offline=True)
        self.assertFalse(check(date(2026,10,1),cal)['isWorkday'])
        self.assertEqual(check(date(2026,10,1),cal)['nextWorkday'],'2026-10-02')
        self.assertTrue(check(date(2026,10,2),cal)['isWorkday'])
        self.assertFalse(check(date(2026,10,10),cal)['isWorkday'])
        self.assertEqual(check(date(2026,10,10),cal)['nextWorkday'],'2026-10-12')
        self.assertFalse(check(date(2026,10,19),cal)['isWorkday'])
        self.assertEqual(check(date(2026,10,19),cal)['nextWorkday'],'2026-10-20')
        with self.assertRaises(ValueError):check(date(2028,1,3),cal)

if __name__=='__main__':unittest.main()
