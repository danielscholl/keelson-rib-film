#!/usr/bin/env python3
"""Synthesize a quiet ambient pad for a bed, procedurally (no samples), so a piece can have music with no service.

Usage: pad.py out.wav --len S [--chords C,Am,F,G] [--bar 4] [--brightness 1800] [--lufs -24] [--seed N]
Each chord holds for --bar seconds and swells into the next. Chords are a root letter, optional # or b, and an
optional m (minor). Writes 48 kHz 16-bit stereo, faded in and out, at --lufs integrated, and out.prompt.txt (the recipe).
"""
import argparse, json, os, subprocess, wave
import numpy as np

SR = 48000
SEMITONE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

p = argparse.ArgumentParser()
p.add_argument("out"); p.add_argument("--len", type=float, required=True)
p.add_argument("--chords", default="C,Am,F,G"); p.add_argument("--bar", type=float, default=4.0)
p.add_argument("--brightness", type=float, default=1800.0); p.add_argument("--lufs", type=float, default=-24.0)
p.add_argument("--seed", type=int, default=7)
a = p.parse_args()


def notes(chord):
    root = SEMITONE[chord[0].upper()] + (1 if "#" in chord else -1 if "b" in chord[1:] else 0)
    third = 3 if chord.rstrip("#b").endswith("m") and len(chord) > 1 else 4
    base = 48 + root  # C3
    return [base - 12, base, base + third, base + 7, base + 12]


hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
n = int(a.len * SR)
t = np.arange(n) / SR
rng = np.random.default_rng(a.seed)
out = np.zeros((2, n))
chords = a.chords.split(",")
fade = min(a.bar * 0.5, 1.5)
for k in range(int(np.ceil(a.len / a.bar)) + 1):
    t0 = k * a.bar - fade
    w = np.clip((t - t0) / fade, 0, 1) * np.clip((t0 + a.bar + 2 * fade - t) / fade, 0, 1)
    w = w * w * (3 - 2 * w)
    if not w.any():
        continue
    for j, m in enumerate(notes(chords[k % len(chords)])):
        gain = 0.5 if j == 0 else 0.3 / (1 + 0.3 * j)
        for ch, cents in enumerate((-4.0, 4.0)):
            f = hz(m) * 2 ** ((cents + rng.uniform(-2, 2)) / 1200)
            phase = rng.uniform(0, 2 * np.pi)
            tone = np.sin(2 * np.pi * f * t + phase) + 0.25 * np.sin(4 * np.pi * f * t + phase)
            out[ch] += gain * w * tone * (1 + 0.08 * np.sin(2 * np.pi * (0.13 + 0.02 * j) * t))

# Gentle lowpass in the frequency domain, so the pad sits under a voice.
spec = np.fft.rfft(out, axis=1)
f = np.fft.rfftfreq(n, 1 / SR)
spec *= 1 / np.sqrt(1 + (f / a.brightness) ** 4)
out = np.fft.irfft(spec, n, axis=1)
edge = np.clip(t / 1.5, 0, 1) * np.clip((a.len - t) / 2.0, 0, 1)
out *= edge
out /= np.abs(out).max() + 1e-9

raw = a.out + ".raw.wav"
with wave.open(raw, "wb") as wv:
    wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR)
    wv.writeframes((out.T * 0.5 * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", f"loudnorm=I={a.lufs}:TP=-3:LRA=7",
                "-ar", str(SR), "-c:a", "pcm_s16le", a.out], check=True)
os.remove(raw)
json.dump(vars(a), open(os.path.splitext(a.out)[0] + ".prompt.txt", "w"), indent=1)
print(f"pad {a.len:.1f}s {a.chords} -> {a.out}")
