# every set: 3 bot games, the best 20 seconds of the best one, captured and mixed into an ad
import os
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
D = os.environ.get('ADS_WORK') or os.path.join(HERE, 'work')   # frames, sounds and the finished videos
os.makedirs(D, exist_ok=True)
import subprocess, json, sys, os
from concurrent.futures import ThreadPoolExecutor
SETS = [('rocks', 'Rocks & Gems'), ('crystal', 'Crystal Cave'), ('ocean', 'Ocean Jewels'), ('royal', 'Royal Treasury'), ('cosmic', 'Cosmic Gems'), ('volcano', 'Volcano Gems'),
        ('pixel', 'Pixel Treasure'), ('odd', 'Odd Shapes'), ('cyber', 'Cyber Circuit'), ('neon', 'Neon Nights'), ('pets', 'Gem Pets'),
        ('atoms', 'Spiral Atoms')]
only = sys.argv[1].split(',') if len(sys.argv) > 1 else None
SONGS = ['carefree', 'easy_lemon', 'wallpaper', 'monkeys_spinning_monkeys']
TEMPO = {'carefree': (96, 0), 'easy_lemon': (82, 0), 'wallpaper': (93, 0), 'monkeys_spinning_monkeys': (72, 0.616)}   # beats a minute, first beat (s): as in sound.js
SONG_OF = {sid: SONGS[i % len(SONGS)] for i, (sid, _) in enumerate(SETS)}   # each set its song, whichever sets are made
SONG_OF['neon'] = 'carefree'
BEAT_SETS = {'neon'}   # sets whose jar keeps a beat: it is the beat of the ad's song
def env_of(sid):
    e = dict(os.environ)
    if sid in BEAT_SETS: e['AD_BEAT'] = '%s,%s' % TEMPO[SONG_OF[sid]]
    return e
def explore(job):
    sid, seed = job
    r = subprocess.run(['node', os.path.join(HERE, 'record.js'), 'explore', sid, str(seed), '110'], cwd=D, capture_output=True, text=True, timeout=900, env=env_of(sid))
    try: return json.loads(r.stdout.strip().splitlines()[-1])
    except Exception: return {'set': sid, 'seed': seed, 'best': None, 'err': r.stderr[-300:]}
sets = [s for s in SETS if not only or s[0] in only]
with ThreadPoolExecutor(3) as ex:
    res = list(ex.map(explore, [(sid, seed) for sid, _ in sets for seed in (1, 2, 3)]))
json.dump(res, open(f'{D}/explore.json', 'w'), indent=1)
picks = {}
for r in res:
    if r.get('best') and (r['set'] not in picks or r['best']['score'] > picks[r['set']]['best']['score']): picks[r['set']] = r
for sid, name in sets:
    p = picks.get(sid); print(sid, 'pick', p and p['seed'], p and p['best'])
def make(i_sid):
    i, (sid, name) = i_sid
    p = picks.get(sid)
    if not p: return f'{sid}: no window'
    b = p['best']; cap = f'{D}/cap_{sid}'
    subprocess.run(['rm', '-rf', cap])
    r = subprocess.run(['node', os.path.join(HERE, 'record.js'), 'capture', sid, str(p['seed']), str(b['start']), str(b['end']), cap], cwd=D, capture_output=True, text=True, timeout=2400, env=env_of(sid))
    song = SONG_OF[sid]
    # a set with a beat: the song starts where its beat falls on the jar's (the jar's beats are at first + k periods from the game's start)
    mstart = b['start'] % (60 / TEMPO[song][0]) if sid in BEAT_SETS else 0
    m = subprocess.run(['python3', os.path.join(HERE, 'make_ad.py'), cap, sid, name, f'{D}/ad_{sid}.mp4', f'{REPO}/assets/music/{song}.mp3', f'{mstart:.3f}'], cwd=D, capture_output=True, text=True)
    return f'{sid}: {r.stdout.strip()[-160:]} | {m.stdout.strip()} {m.stderr[-200:]}'
with ThreadPoolExecutor(3) as ex:
    for line in ex.map(make, list(enumerate(sets))): print(line)
