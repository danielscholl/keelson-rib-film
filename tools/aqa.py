#!/usr/bin/env python3
"""Audio QA without listening: integrated loudness, LRA, true peak (ffmpeg ebur128), and band levels per window.

Usage: aqa.py file [--win name:start:end ...] [--spec out.png]
Bands: <250 Hz, 250-1k, 1-4k (the voice's presence range), 4-8k, >8k, in dBFS RMS per window.
"""
import argparse, re, subprocess
import numpy as np

p = argparse.ArgumentParser()
p.add_argument("file"); p.add_argument("--win", nargs="*", default=[]); p.add_argument("--spec")
a = p.parse_args()
log = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", a.file, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
summ = log[log.rfind("Summary:"):]
I = re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", summ); L = re.search(r"LRA:\s+(-?[\d.]+) LU", summ)
TP = re.search(r"True peak:\s+Peak:\s+(-?[\d.]+|-inf)", summ)
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", a.file, "-vn", "-ac", "1", "-ar", "48000", "-f", "f32le", "-"],
                     capture_output=True).stdout
x = np.frombuffer(raw, np.float32); sr = 48000
multi = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", a.file, "-vn", "-ar", "48000", "-f", "f32le", "-"],
                                     capture_output=True).stdout, np.float32)
print(f"{a.file.split('/')[-1]}: {len(x)/sr:.2f}s  I {I.group(1)} LUFS  LRA {L.group(1)} LU  TP {TP.group(1)} dBTP"
      f"  clipped samples {int((np.abs(multi) >= 0.999).sum())}")
bands = [(20, 250), (250, 1000), (1000, 4000), (4000, 8000), (8000, 20000)]
print(f"  {'window':<14}{'rms':>7}" + "".join(f"{f'{lo}-{hi}':>11}" for lo, hi in bands))
for w in a.win or [f"all:0:{len(x)/sr}"]:
    name, s, e = w.split(":"); seg = x[int(float(s) * sr):int(float(e) * sr)]
    if not len(seg): continue
    spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
    f = np.fft.rfftfreq(len(seg), 1 / sr)
    tot = spec.sum() + 1e-20
    rms = 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12)
    row = "".join(f"{10*np.log10(spec[(f>=lo)&(f<hi)].sum()/tot+1e-12)+rms:>11.1f}" for lo, hi in bands)
    print(f"  {name:<14}{rms:>7.1f}{row}")
if a.spec:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.file, "-vn", "-lavfi",
                    "showspectrumpic=s=1200x400:legend=1:scale=log:fscale=log:color=intensity", a.spec])
