#!/usr/bin/env python3
"""Build one bookend audio bed: a music window (optional), the foley, a 1-4 kHz dip and a duck under the line, set to a
target loudness. Writes out.wav (48 kHz stereo) and out.prompt.txt (the recipe).

Usage: bed.py out.wav --len 9.3 [--music take.mp3 --from 15.95 --fade-in 0.6 --music-db 0]
              [--foley foley.wav --foley-db 0] --line 5.4 8.13 [--dip -7] [--duck -3] [--fade-out 0.7] [--lufs -22]
Times are bed seconds. The dip is a wide peaking cut at 2 kHz (two octaves) blended in 0.35 s before the line and out
0.35 s after it; the duck is applied to the music only.
"""
import argparse, re, subprocess, sys, wave
import numpy as np

p = argparse.ArgumentParser()
p.add_argument("out"); p.add_argument("--len", type=float, required=True)
p.add_argument("--music"); p.add_argument("--from", dest="src", type=float, default=0.0)
p.add_argument("--at", type=float, default=0.0, help="bed second the music window starts at")
p.add_argument("--fade-in", type=float, default=0.3); p.add_argument("--music-db", type=float, default=0.0)
p.add_argument("--foley"); p.add_argument("--foley-db", type=float, default=0.0)
p.add_argument("--line", type=float, nargs=2, required=True)
p.add_argument("--dip", type=float, default=-7.0); p.add_argument("--duck", type=float, default=-3.0)
p.add_argument("--fade-out", type=float, default=0.7); p.add_argument("--lufs", type=float, default=-22.0)
p.add_argument("--note", default="")
a = p.parse_args()
SR = 48000; N = int(a.len * SR)


def load(path, start=0.0, af=None):
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{start}", "-i", path, "-t", f"{a.len}"]
    if af: cmd += ["-af", af]
    cmd += ["-ac", "2", "-ar", str(SR), "-f", "f32le", "-"]
    x = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).reshape(-1, 2).astype(float)
    out = np.zeros((N, 2)); out[:min(N, len(x))] = x[:N]
    return out


t = np.arange(N) / SR
l0, l1 = a.line
w = np.clip(np.minimum((t - (l0 - 0.35)) / 0.35, ((l1 + 0.35) - t) / 0.35), 0, 1)[:, None]   # 0 outside, 1 under the line
eq = f"equalizer=f=2000:t=o:w=2:g={a.dip}"
mix = np.zeros((N, 2))
if a.music:
    m, md = load(a.music, a.src), load(a.music, a.src, eq)
    if a.at:
        k = int(a.at * SR); m, md = (np.vstack([np.zeros((k, 2)), x[:N - k]]) for x in (m, md))
    m = m * (1 - w) + md * w * 10 ** (a.duck / 20)
    m *= np.clip((t - a.at) / max(a.fade_in, 1e-3), 0, 1)[:, None]
    mix += m * 10 ** (a.music_db / 20)
if a.foley:
    f, fd = load(a.foley), load(a.foley, 0, eq)
    mix += (f * (1 - w) + fd * w) * 10 ** (a.foley_db / 20)
mix *= np.clip((a.len - t) / max(a.fade_out, 1e-3), 0, 1)[:, None]


def write(path, x):
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR)
        wv.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


def lufs(path):
    log = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    s = log[log.rfind("Summary:"):]
    return float(re.search(r"I:\s+(-?[\d.]+) LUFS", s).group(1)), float(re.search(r"Peak:\s+(-?[\d.]+|-inf)", s).group(1))


mix *= 0.5 / (np.abs(mix).max() + 1e-9)
write(a.out, mix)
i, _ = lufs(a.out)
mix *= 10 ** ((a.lufs - i) / 20)
if np.abs(mix).max() > 10 ** (-3 / 20):            # keep 3 dB of headroom with a gentle soft clip on stray peaks
    lim = 10 ** (-3 / 20); mix = np.tanh(mix / lim) * lim
write(a.out, mix)
i, tp = lufs(a.out)
with open(a.out[:-4] + ".prompt.txt", "w") as fh:
    fh.write(f"built by tools/bed.py: {' '.join(sys.argv[1:])}\nresult: {a.len}s, I {i} LUFS, true peak {tp} dBTP\n")
    if a.note: fh.write(f"\n{a.note}\n")
print(f"{a.out}: I {i} LUFS, TP {tp} dBTP")
