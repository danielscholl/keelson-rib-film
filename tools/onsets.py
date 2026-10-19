#!/usr/bin/env python3
"""Print note onsets (spectral flux peaks) and the RMS envelope, to choose cut points in a music take.
Usage: onsets.py file [--from S] [--to E] [--top N]"""
import argparse, subprocess
import numpy as np
p = argparse.ArgumentParser(); p.add_argument("file"); p.add_argument("--from", dest="s", type=float, default=0)
p.add_argument("--to", type=float, default=1e9); p.add_argument("--top", type=int, default=40)
a = p.parse_args()
sr = 48000
x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", a.file, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                                 capture_output=True).stdout, np.float32)
hop, n = 480, 2048
frames = np.lib.stride_tricks.sliding_window_view(x, n)[::hop] * np.hanning(n)
mag = np.log1p(np.abs(np.fft.rfft(frames, axis=1)) * 10)
flux = np.maximum(np.diff(mag, axis=0), 0).sum(1)
flux = (flux - np.median(flux)) / (flux.std() + 1e-9)
t = (np.arange(len(flux)) + 1) * hop / sr
rms = 20 * np.log10(np.sqrt((frames ** 2).mean(1)) + 1e-9)
peaks = [i for i in range(2, len(flux) - 2) if flux[i] == flux[i - 2:i + 3].max() and flux[i] > 1.5 and a.s <= t[i] <= a.to]
peaks = sorted(sorted(peaks, key=lambda i: -flux[i])[:a.top])
print(" ".join(f"{t[i]:.2f}({flux[i]:.0f})" for i in peaks))
env = [f"{s:.0f}:{rms[int(s * sr / hop)]:.0f}" for s in np.arange(max(a.s, 0), min(a.to, len(x) / sr), 1.0)]
print("rms/s", " ".join(env))
