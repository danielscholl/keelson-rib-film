#!/usr/bin/env python3
"""Measure a music track for cutting to it: tempo, beats, downbeats, the drop, and the strongest hits.

Usage: beats.py <audio> [--out beats.json] [--bpm N] [--hits 24]
Writes { bpm, beats, downbeats, drop, hits } in seconds. Onsets are spectral-flux peaks (as onsets.py finds them);
tempo is the autocorrelation peak of that envelope between 70 and 180 BPM unless --bpm is given; beats are the grid
phase that lands on the most onset energy, each snapped to an onset within 40 ms; downbeats are the beat phase (of 4)
with the most energy below 150 Hz; the drop is the bar with the largest rise in low and full-band level over the two
bars before it, moved to its strongest onset within 60 ms (null when no bar rises 6 dB). Check the drop by ear or on a spectrogram before cutting to it.
"""
import argparse, json, subprocess
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("audio"); ap.add_argument("--out", default="beats.json")
ap.add_argument("--bpm", type=float); ap.add_argument("--hits", type=int, default=24)
a = ap.parse_args()

SR, HOP, N = 22050, 256, 1024
x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", a.audio, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                 capture_output=True, check=True).stdout, np.float32)
if len(x) < N * 4:
    raise SystemExit("audio too short to measure")
frames = np.lib.stride_tricks.sliding_window_view(x, N)[::HOP] * np.hanning(N)
spec = np.abs(np.fft.rfft(frames, axis=1))
freqs = np.fft.rfftfreq(N, 1 / SR)
mag = np.log1p(spec * 10)
flux = np.zeros(len(mag))
flux[1:] = np.maximum(np.diff(mag, axis=0), 0).sum(1)
env = (flux - np.median(flux)) / (flux.std() + 1e-9)
fr = SR / HOP
# Flux peaks as an onset enters the window's leading edge; 0.8 N is calibrated on a click track.
t_of = lambda i: (i * HOP + 0.8 * N) / SR
low = np.sqrt((spec[:, freqs < 150] ** 2).mean(1)) + 1e-9
full = np.sqrt((frames ** 2).mean(1)) + 1e-9

if a.bpm:
    bpm = a.bpm
else:
    e = np.maximum(env, 0) - np.maximum(env, 0).mean()
    ac = np.correlate(e, e, "full")[len(e) - 1:]
    lags = np.arange(len(ac))
    ok = (lags >= 60 / 180 * fr) & (lags <= 60 / 70 * fr)
    k = lags[ok][np.argmax(ac[ok])]
    if 1 <= k < len(ac) - 1:
        y0, y1, y2 = ac[k - 1], ac[k], ac[k + 1]
        k = k + 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2 + 1e-12)
    bpm = 60 * fr / k
P = 60 / bpm * fr

pos = np.maximum(env, 0)
best, phase = -1.0, 0.0
for ph in np.arange(0, P, 0.5):
    idx = np.round(np.arange(ph, len(pos), P)).astype(int)
    idx = idx[idx < len(pos)]
    sc = pos[idx].sum()
    if sc > best:
        best, phase = sc, ph
grid = np.arange(phase, len(pos), P)
snap = int(round(0.04 * fr))
beats = []
for g in grid:
    i = int(round(g))
    lo, hi = max(0, i - snap), min(len(pos), i + snap + 1)
    j = lo + int(np.argmax(pos[lo:hi])) if pos[lo:hi].max() > 1.0 else i
    beats.append(min(j, len(pos) - 1))
beats = np.array(beats)

score = [low[beats[r::4]].mean() if len(beats[r::4]) else 0 for r in range(4)]
r0 = int(np.argmax(score))
down = beats[r0::4]

drop = None
if len(down) >= 4:
    level = lambda s, e: 20 * np.log10(low[s:e].mean()) + 20 * np.log10(full[s:e].mean())
    bars = list(down) + [len(pos)]
    lv = [level(bars[k], bars[k + 1]) for k in range(len(bars) - 1)]
    whole = [bars[k + 1] - bars[k] >= 3.6 * P for k in range(len(bars) - 1)]
    rise = [(lv[k] - (lv[k - 1] + lv[k - 2]) / 2, k) for k in range(2, len(lv)) if whole[k] and whole[k - 1] and whole[k - 2]]
    if rise and max(rise)[0] >= 6.0:  # dB; a track that only grows gently has no drop
        k = max(rise)[1]
        i = bars[k]
        w = int(round(0.06 * fr))
        lo, hi = max(0, i - w), min(len(pos), i + w + 1)
        drop = lo + int(np.argmax(pos[lo:hi]))

peaks = [i for i in range(2, len(env) - 2) if env[i] == env[i - 2:i + 3].max() and env[i] > 1.5]
hits = sorted(sorted(peaks, key=lambda i: -env[i])[:a.hits])

r3 = lambda v: round(float(v), 3)
out = {"bpm": round(float(bpm), 2), "beats": [r3(t_of(i)) for i in beats], "downbeats": [r3(t_of(i)) for i in down],
       "drop": r3(t_of(drop)) if drop is not None else None, "hits": [r3(t_of(i)) for i in hits]}
json.dump(out, open(a.out, "w"), indent=1)
print(f"{a.audio}: {out['bpm']} BPM, {len(out['beats'])} beats, first downbeat {out['downbeats'][0] if out['downbeats'] else '-'}, "
      f"drop {out['drop']} -> {a.out}")
