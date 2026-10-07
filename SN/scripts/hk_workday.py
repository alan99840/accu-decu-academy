"""Hong Kong Monday-Friday workday guard using the government's 1823 calendar."""
import argparse, json, ssl
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.request import urlopen
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://www.1823.gov.hk/common/ical/tc.json'

def normalize(raw):
    events = raw['vcalendar'][0]['vevent']
    holidays = {datetime.strptime(e['dtstart'][0], '%Y%m%d').date().isoformat():e['summary'] for e in events}
    years = sorted({int(d[:4]) for d in holidays})
    if not years or any(sum(d.startswith(str(y)) for d in holidays)<17 for y in years):
        raise ValueError('官方假期資料不完整')
    return dict(source=SOURCE, fetchedAt=datetime.now(timezone.utc).isoformat(), years=years, holidays=holidays)

def load_calendar(offline=False):
    cache = ROOT/'private/hk-holidays.json'
    if not offline:
        try:
            try:
                import certifi
                context = ssl.create_default_context(cafile=certifi.where())
            except ImportError:
                context = ssl.create_default_context()
            with urlopen(SOURCE, timeout=20, context=context) as response:
                cal = normalize(json.loads(response.read().decode('utf-8-sig')))
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_text(json.dumps(cal,ensure_ascii=False,indent=2))
            return cal
        except Exception as error:
            fetch_error = str(error)
    else:
        fetch_error = '離線驗證'
    fallback = cache if cache.exists() else ROOT/'scripts/hk-holidays.json'
    cal = json.loads(fallback.read_text())
    age = (datetime.now(timezone.utc)-datetime.fromisoformat(cal['fetchedAt'])).days
    if not offline and age>45:
        raise ValueError('假期日曆更新失敗且快取超過 45 日：'+fetch_error)
    return {**cal,'cacheUsed':True,'refreshError':fetch_error}

def workday(day,cal):
    if day.year not in cal['years']:
        raise ValueError(f'{day.year} 年不在官方假期日曆範圍內')
    return day.weekday()<5 and day.isoformat() not in cal['holidays']

def check(day,cal):
    valid = workday(day,cal)
    nxt = day+timedelta(days=1)
    try:
        while not workday(nxt,cal): nxt+=timedelta(days=1)
        next_day = nxt.isoformat()
    except ValueError:
        next_day = None
    return dict(date=day.isoformat(),isWorkday=valid,
                reason=cal['holidays'].get(day.isoformat(),'週末' if day.weekday()>=5 else '香港工作日'),
                nextWorkday=next_day,calendarYears=cal['years'],source=cal['source'],
                cacheUsed=cal.get('cacheUsed',False),refreshError=cal.get('refreshError'))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--date',type=date.fromisoformat)
    p.add_argument('--offline',action='store_true');a=p.parse_args()
    day=a.date or datetime.now(ZoneInfo('Asia/Hong_Kong')).date()
    print(json.dumps(check(day,load_calendar(a.offline)),ensure_ascii=False))
