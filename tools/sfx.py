#!/usr/bin/env python3
"""Synthesize one quiet UI sound effect, procedurally (no samples), and print its peak time.

Usage: sfx.py <voice> out.wav [--dur S] [--pitch N] [--seed N]
Voices: click, tick, pop, thump, whoosh, riser, chime. --pitch shifts tick, pop and chime by N semitones;
--dur sets the length of whoosh and riser (a riser's peak is its last moment, so it lands at t).
Writes 48 kHz 16-bit stereo, peak -6 dBFS. Prints the peak (argmax |s|) in seconds; compose.py places by it.
"""
import argparse, wave
import numpy as np

SR = 48000
VOICES = ("click", "tick", "pop", "thump", "whoosh", "riser", "chime")


def env(n, attack, decay):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - attack, 0) / decay)


def sweep(f0, f1, n):
    f = f0 * (f1 / f0) ** (np.arange(n) / max(n - 1, 1))
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def lowpass(x, cut):
    """One-pole lowpass; `cut` is a frequency in Hz or an array of them, one per sample."""
    cut = np.broadcast_to(np.asarray(cut, float), x.shape)
    a = 1 - np.exp(-2 * np.pi * cut / SR)
    y, s = np.empty_like(x), 0.0
    for i in range(len(x)):
        s += a[i] * (x[i] - s)
        y[i] = s
    return y


def synth(voice, dur, pitch, rng):
    k = 2 ** (pitch / 12)
    if voice == "click":
        n = int(0.03 * SR)
        noise = rng.standard_normal(n) * env(n, 0.0005, 0.003)
        tone = np.sin(2 * np.pi * 2600 * k * np.arange(n) / SR) * env(n, 0.0005, 0.008)
        return noise - lowpass(noise, 3000) + 0.5 * tone
    if voice == "tick":
        n = int(0.06 * SR)
        return np.sin(2 * np.pi * 1800 * k * np.arange(n) / SR) * env(n, 0.001, 0.012)
    if voice == "pop":
        n = int(0.09 * SR)
        body = sweep(620 * k, 210 * k, n) * env(n, 0.002, 0.03)
        return body + 0.08 * lowpass(rng.standard_normal(n), 2500) * env(n, 0.001, 0.006)
    if voice == "thump":
        n = int(0.3 * SR)
        body = sweep(85, 42, n) * env(n, 0.003, 0.08)
        return body + 0.25 * lowpass(rng.standard_normal(n), 400) * env(n, 0.002, 0.02)
    if voice == "whoosh":
        n = int((dur or 0.6) * SR)
        x = np.linspace(0, 1, n)
        shape = np.sin(np.pi * np.clip(x / 0.6, 0, 1) * 0.5) ** 2 * np.clip((1 - x) / 0.4, 0, 1) ** 1.5
        return lowpass(rng.standard_normal(n), 300 + 3200 * shape) * shape
    if voice == "riser":
        n = int((dur or 1.2) * SR)
        x = np.linspace(0, 1, n)
        rise = x ** 2.2
        body = lowpass(rng.standard_normal(n), 200 + 4800 * rise) * rise + 0.3 * sweep(180, 720, n) * rise
        tail = int(0.02 * SR)
        body[-tail:] *= np.linspace(1, 0, tail) ** 0.5
        return body
    if voice == "chime":
        n = int(1.6 * SR)
        t = np.arange(n) / SR
        f = 880 * k
        partials = [(1.0, 1.0, 0.9), (2.76, 0.4, 0.5), (5.4, 0.18, 0.25)]
        return sum(g * np.sin(2 * np.pi * f * r * t) * env(n, 0.003, d) for r, g, d in partials)
    raise SystemExit(f"unknown voice {voice!r}; voices: {', '.join(VOICES)}")


ap = argparse.ArgumentParser()
ap.add_argument("voice", choices=VOICES); ap.add_argument("out")
ap.add_argument("--dur", type=float); ap.add_argument("--pitch", type=float, default=0.0)
ap.add_argument("--seed", type=int, default=7)
a = ap.parse_args()
s = synth(a.voice, a.dur, a.pitch, np.random.default_rng(a.seed))
s = s / np.max(np.abs(s)) * 10 ** (-6 / 20)
pcm = (np.repeat(s[:, None], 2, axis=1) * 32767).astype("<i2")
with wave.open(a.out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f"{np.argmax(np.abs(s)) / SR:.4f}")
