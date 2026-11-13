# capture + mix the given sets again from the picks in explore.json (no new bot games)
import os
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
D = os.environ.get('ADS_WORK') or os.path.join(HERE, 'work')   # frames, sounds and the finished videos
os.makedirs(D, exist_ok=True)
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
SETS = [('rocks', 'Rocks & Gems'), ('crystal', 'Crystal Cave'), ('ocean', 'Ocean Jewels'), ('royal', 'Royal Treasury'), ('cosmic', 'Cosmic Gems'), ('volcano', 'Volcano Gems'),
        ('pixel', 'Pixel Treasure'), ('odd', 'Odd Shapes'), ('cyber', 'Cyber Circuit'), ('neon', 'Neon Nights'), ('pets', 'Gem Pets')]
SONGS = ['carefree', 'easy_lemon', 'wallpaper', 'monkeys_spinning_monkeys']
res = json.load(open(f'{D}/explore.json'))
picks = {}
for r in res:
    if r.get('best') and (r['set'] not in picks or r['best']['score'] > picks[r['set']]['best']['score']): picks[r['set']] = r
want = sys.argv[1].split(',')
def make(sid):
    i = [s for s, _ in SETS].index(sid); name = SETS[i][1]; p = picks[sid]; b = p['best']; cap = f'{D}/cap_{sid}'
    subprocess.run(['rm', '-rf', cap])
    r = subprocess.run(['node', os.path.join(HERE, 'record.js'), 'capture', sid, str(p['seed']), str(b['start']), str(b['end']), cap], cwd=D, capture_output=True, text=True, timeout=2400)
    m = subprocess.run(['python3', os.path.join(HERE, 'make_ad.py'), cap, sid, name, f'{D}/ad_{sid}.mp4', f'{REPO}/assets/music/{SONGS[i % 4]}.mp3', '0'], cwd=D, capture_output=True, text=True)
    return f'{sid}: {r.stdout.strip()[-150:]} {r.stderr.strip()[-150:]} | {m.stdout.strip()} {m.stderr.strip()[-150:]}'
with ThreadPoolExecutor(3) as ex:
    for line in ex.map(make, want): print(line, flush=True)
