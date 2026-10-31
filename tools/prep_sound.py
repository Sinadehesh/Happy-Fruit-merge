# Prepare a game sound: trim leading silence, normalise the peak, short fade-out, save as 44.1 kHz mono 16-bit WAV.
# Usage: python3 tools/prep_sound.py in_file out.wav [peak_dB, default -1] [max_seconds]
import sys, subprocess
import numpy as np
from scipy.io import wavfile
src, out = sys.argv[1], sys.argv[2]
peak_db = float(sys.argv[3]) if len(sys.argv) > 3 else -1.0
max_s = float(sys.argv[4]) if len(sys.argv) > 4 else None
SR = 44100
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).copy()
start = int(np.argmax(np.abs(x) > np.abs(x).max() * 0.02))
x = x[max(0, start - int(0.002 * SR)):]                       # keep 2 ms before the attack
end = len(x) - int(np.argmax(np.abs(x[::-1]) > np.abs(x).max() * 0.005))
x = x[:end + int(0.01 * SR)]
if max_s: x = x[:int(max_s * SR)]
fade = min(len(x) // 4, int(0.012 * SR))
if fade: x[-fade:] *= np.linspace(1, 0, fade)
x *= (10 ** (peak_db / 20)) / (np.abs(x).max() + 1e-9)
wavfile.write(out, SR, (x * 32767).astype(np.int16))
print(f'{out}: {len(x) / SR:.2f}s')
