# Prepare a voice line: trim silence at both ends, match loudness (so every line sits at the same level),
# keep peaks under -1 dB with a soft limiter, short fades, save as 44.1 kHz mono MP3.
# Usage: python3 tools/prep_voice.py in_file out.mp3 [target_rms_dB, default -16]
import sys, subprocess
import numpy as np
src, out = sys.argv[1], sys.argv[2]
target = float(sys.argv[3]) if len(sys.argv) > 3 else -16.0
SR = 44100
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).astype(np.float64)
a = np.abs(x)
env = np.convolve(a, np.ones(441) / 441, 'same')                 # 10 ms envelope
on = env > env.max() * 0.03
start, end = np.argmax(on), len(x) - np.argmax(on[::-1])
x = x[max(0, start - int(0.03 * SR)):min(len(x), end + int(0.12 * SR))]   # keep the breath in and the tail out
voiced = np.convolve(np.abs(x), np.ones(441) / 441, 'same') > env.max() * 0.03
rms = np.sqrt((x[voiced] ** 2).mean())
x *= 10 ** (target / 20) / rms
ceil = 10 ** (-1 / 20)
x = np.where(np.abs(x) > ceil * 0.8, np.sign(x) * (ceil * 0.8 + (ceil * 0.2) * np.tanh((np.abs(x) - ceil * 0.8) / (ceil * 0.2))), x)
fi, fo = int(0.01 * SR), int(0.06 * SR)
x[:fi] *= np.linspace(0, 1, fi); x[-fo:] *= np.linspace(1, 0, fo)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-q:a', '2', out],
               input=x.astype(np.float64).tobytes(), check=True)
print(f'{out}: {len(x) / SR:.2f}s, gain {20 * np.log10(10 ** (target / 20) / rms):+.1f} dB')
