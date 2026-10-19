#!/usr/bin/env python3
"""Synthesize a light music bed, procedurally (no samples), so a piece can have music with no service.

Usage: loop.py out.wav --len S [--bpm 96] [--chords Cmaj7,Am7,Fmaj7,G7] [--seed N] [--lufs -24]
               [--no-beat] [--no-arp]
A soft electric piano on the chords (one per bar), a plucked arpeggio in eighths, a sub bass, and a quiet kick and
brushed hat. Chords are a root (C, F#, Bb) and a quality: maj7, m7, 7, m, or none for a major triad.
Writes 48 kHz 16-bit stereo, faded in and out, at --lufs integrated, and out.prompt.txt (the recipe).
"""
import argparse, json, os, subprocess, wave
import numpy as np

SR = 48000
ROOTS = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
QUALITY = {"maj7": (0, 4, 7, 11), "m7": (0, 3, 7, 10), "7": (0, 4, 7, 10), "m": (0, 3, 7), "": (0, 4, 7)}

p = argparse.ArgumentParser()
p.add_argument("out"); p.add_argument("--len", type=float, required=True)
p.add_argument("--bpm", type=float, default=96.0); p.add_argument("--chords", default="Cmaj7,Am7,Fmaj7,G7")
p.add_argument("--seed", type=int, default=7); p.add_argument("--lufs", type=float, default=-24.0)
p.add_argument("--no-beat", action="store_true"); p.add_argument("--no-arp", action="store_true")
a = p.parse_args()


def chord(name):
    root = ROOTS[name[0].upper()]
    rest = name[1:]
    if rest[:1] in ("#", "b"):
        root += 1 if rest[0] == "#" else -1
        rest = rest[1:]
    if rest not in QUALITY:
        raise SystemExit(f"chord {name!r}: use a quality of {', '.join(q or '(major)' for q in QUALITY)}")
    return root % 12, QUALITY[rest]


hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
n = int(a.len * SR)
out = np.zeros((2, n))
rng = np.random.default_rng(a.seed)
beat = 60.0 / a.bpm
bar = 4 * beat


def place(sig, at, pan=0.0, gain=1.0):
    i = int(at * SR)
    if i >= n:
        return
    sig = sig[: n - i] * gain
    out[0, i:i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan))
    out[1, i:i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))


def epiano(f, dur):
    t = np.arange(int(dur * SR)) / SR
    index = 1.8 * np.exp(-t / 0.35)
    env = (1 - np.exp(-t / 0.004)) * np.exp(-t / 1.4)
    return env * np.sin(2 * np.pi * f * t + index * np.sin(2 * np.pi * f * t))


def pluck(f, dur=0.6):
    t = np.arange(int(dur * SR)) / SR
    env = (1 - np.exp(-t / 0.002)) * np.exp(-t / 0.18)
    return env * (np.sin(2 * np.pi * f * t) + 0.35 * np.exp(-t / 0.05) * np.sin(6 * np.pi * f * t))


def bass(f, dur):
    t = np.arange(int(dur * SR)) / SR
    env = (1 - np.exp(-t / 0.01)) * np.exp(-t / (dur * 0.6))
    return env * (np.sin(2 * np.pi * f * t) + 0.15 * np.sin(4 * np.pi * f * t))


def kick():
    t = np.arange(int(0.25 * SR)) / SR
    f = 50 + 70 * np.exp(-t / 0.03)
    return np.exp(-t / 0.09) * np.sin(2 * np.pi * np.cumsum(f) / SR)


def hat():
    m = int(0.06 * SR)
    noise = np.diff(rng.standard_normal(m), prepend=0)  # tilt toward the top end
    return noise * np.exp(-np.arange(m) / SR / 0.018)


chords = [chord(c) for c in a.chords.split(",")]
arp = (0, 2, 1, 3, 2, 1, 3, 2)
for k in range(int(np.ceil(a.len / bar))):
    t0 = k * bar
    root, ivs = chords[k % len(chords)]
    base = (60 if root < 6 else 48) + root  # keep the voicing around middle C
    for j, iv in enumerate(ivs):
        place(epiano(hz(base + iv), bar + 0.6), t0 + 0.012 * j, pan=(-0.25, 0.1, -0.05, 0.25)[j % 4], gain=0.16)
    place(bass(hz(36 + root), beat * 1.6), t0, gain=0.5)
    place(bass(hz(36 + root), beat * 0.9), t0 + 2.5 * beat, gain=0.38)
    if not a.no_arp:
        for s in range(8):
            iv = ivs[arp[s] % len(ivs)]
            place(pluck(hz(base + 12 + iv)), t0 + s * beat / 2, pan=0.35 if s % 2 else -0.35, gain=0.1)
    if not a.no_beat:
        for b in (0, 2):
            place(kick(), t0 + b * beat, gain=0.55)
        for s in range(8):
            place(hat(), t0 + s * beat / 2, pan=0.2, gain=0.035 if s % 2 else 0.018)

t = np.arange(n) / SR
out *= np.clip(t / 1.0, 0, 1) * np.clip((a.len - t) / 1.5, 0, 1)
out /= np.abs(out).max() + 1e-9

raw = a.out + ".raw.wav"
with wave.open(raw, "wb") as wv:
    wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR)
    wv.writeframes((out.T * 0.7 * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", f"loudnorm=I={a.lufs}:TP=-3:LRA=7",
                "-ar", str(SR), "-c:a", "pcm_s16le", a.out], check=True)
os.remove(raw)
json.dump({k: v for k, v in vars(a).items() if k != "out"}, open(os.path.splitext(a.out)[0] + ".prompt.txt", "w"), indent=1)
print(f"loop {a.len:.1f}s {a.chords} at {a.bpm:g} bpm -> {a.out}")
