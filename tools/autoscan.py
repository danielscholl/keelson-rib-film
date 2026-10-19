#!/usr/bin/env python3
"""Automated defect candidates for a cut: what a person reading the scan sheets should look at first.

Usage: autoscan.py <short-dir> [--video final.mp4] [--qa-dir qa]
Decodes the video small and grey and writes <qa-dir>/autoscan.md, one row per candidate:
  pop      one frame changes far more than both its neighbours (a layer appearing early, a hard cut nobody planned)
  flash    frame n differs from both neighbours while they match each other (a one-frame glitch)
  flashes  more than 3 flashes in one second (the WCAG 2.3.1 limit; full-frame luminance only)
  static   2 s or more with no motion and no narration, or 6 s or more under narration (a board that has stopped
           moving while it is talked over); pause-and-answer holds and `holds:` are allowed
  frame0   the first frame is near-uniform (expected with compose's fade-in; choose the poster elsewhere)
  loop     the last frame differs from the first, when the manifest says `loop: true`
These are candidates, not verdicts: every row is checked on the frames and either fixed or noted in qa/defects.md.
"""
import argparse, json, os, subprocess
import numpy as np
import yaml

ap = argparse.ArgumentParser()
ap.add_argument("short"); ap.add_argument("--video", default="final.mp4"); ap.add_argument("--qa-dir")
a = ap.parse_args()
root = os.path.abspath(a.short)
video = a.video if os.path.isabs(a.video) else os.path.join(root, a.video)
qa = os.path.abspath(a.qa_dir) if a.qa_dir else os.path.join(root, "qa")
W, H = 192, 108

num, den = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=r_frame_rate",
                           "-of", "csv=p=0", video], capture_output=True, text=True, check=True).stdout.strip().strip(",").split("/")
fps = float(num) / float(den or 1)
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vf", f"scale={W}:{H}:flags=area", "-f", "rawvideo",
                      "-pix_fmt", "gray", "-"], capture_output=True, check=True).stdout
F = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)
n = len(F)
total = n / fps
tsec = lambda i: i / fps

d = np.zeros(n)
moving = np.zeros(n, int)
for i in range(1, n, 512):
    j = min(n, i + 512)
    diff = np.abs(F[i:j] - F[i - 1:j - 1])
    d[i:j] = diff.mean(axis=(1, 2))
    moving[i:j] = (diff > 6).sum(axis=(1, 2))
lum = F.mean(axis=(1, 2))

man = {}
if os.path.exists(os.path.join(root, "short.yaml")):
    man = yaml.safe_load(open(os.path.join(root, "short.yaml"))) or {}
lines = []
tl_path = os.path.join(root, "build", "timeline.json")
if os.path.exists(tl_path):
    tl = json.load(open(tl_path))
    text = {ln["id"]: ln.get("text", "") for ln in man.get("lines", [])}
    lines = sorted(((v["start"], v["end"], k, text.get(k, "")) for k, v in tl.get("lines", {}).items()))
allowed = [tuple(h) for h in man.get("holds", [])]
# A question line (id q1, q2, ... or text opening "Pause and answer") may hold silent until the answer starts.
for k, (s, e, lid, txt) in enumerate(lines):
    if txt.lower().startswith("pause and answer") or (lid[:1] == "q" and lid[1:].isdigit()):
        allowed.append((s, lines[k + 1][0] if k + 1 < len(lines) else total))

rows = []
edge = 0.7
FLOOR = 2.0
for i in range(2, n - 1):
    if not (edge <= tsec(i) <= total - edge):
        continue
    if d[i] > FLOOR and d[i] > 3 * d[i - 1] and d[i] > 3 * d[i + 1]:
        rows.append((tsec(i), "pop", f"{d[i]:.1f} vs {d[i - 1]:.1f}/{d[i + 1]:.1f}", "a hard cut, or something appearing a frame early"))
for i in range(1, n - 1):
    a1, a2 = d[i], d[i + 1]
    if a1 > 4 and a2 > 4:
        around = np.abs(F[i + 1] - F[i - 1]).mean()
        if around < 0.3 * min(a1, a2):
            rows.append((tsec(i), "flash", f"{min(a1, a2):.1f} vs neighbours {around:.1f}", "one frame unlike both neighbours"))

# Flashes: opposing luminance swings of about 10% of full scale; a flash is one pair of them.
step = max(1, round(fps / 15))
dl = lum[step:] - lum[:-step]
events, last = [], 0
for i, v in enumerate(dl):
    sgn = 1 if v > 25 else -1 if v < -25 else 0
    if sgn and sgn != last:
        events.append(tsec(i + step)); last = sgn
    elif not sgn and abs(v) < 5:
        last = 0
events = np.array(events)
flagged_until = -1
for t0 in events:
    if t0 < flagged_until:
        continue
    k = ((events >= t0) & (events < t0 + 1.0)).sum()
    if k // 2 > 3:
        rows.append((t0, "flashes", f"{k // 2} in 1 s", "over the WCAG 2.3.1 three-flash limit"))
        flagged_until = t0 + 1.0

STILL = 8  # pixels of the small frame that changed; a mean would miss one small thing moving
quiet_reads = 0
i = 1
while i < n:
    if moving[i] < STILL:
        j = i
        while j < n and moving[j] < STILL:
            j += 1
        s, e = tsec(i - 1), tsec(j - 1)
        if e - s >= 2.0 and not any(hs <= s + 0.1 and e - 0.1 <= he for hs, he in allowed):
            under = sum(max(0, min(e, le) - max(s, ls)) for ls, le, _, _ in lines)
            narrated = under >= 0.6 * (e - s)
            if narrated and e - s < 6.0:
                quiet_reads += 1
            else:
                note = "under narration" if narrated else "silent" if under == 0 else "partly silent"
                rows.append((s, "static", f"{e - s:.1f} s to {e:.2f}", note))
        i = j
    else:
        i += 1

if F[0].std() < 2:
    rows.append((0.0, "frame0", f"std {F[0].std():.1f}", "uniform first frame; expected with a fade-in, so set a poster"))
if man.get("loop"):
    seam = np.abs(F[-1] - F[0]).mean()
    rows.append((total, "loop", f"last vs first {seam:.1f}", "seamless" if seam < 1.5 else "the loop jumps"))

strobe = [t0 for t0, kind, _, _ in rows if kind == "flashes"]
rows = [r for r in rows if not (r[1] == "pop" and any(s0 <= r[0] <= s0 + 1.0 for s0 in strobe))]
rows.sort()
os.makedirs(qa, exist_ok=True)
with open(os.path.join(qa, "autoscan.md"), "w") as fh:
    fh.write(f"# Autoscan · {os.path.basename(video)} · {total:.1f} s at {fps:g} fps\n\n")
    fh.write("Candidates, not verdicts. Check each on the frames; fix it or note it in defects.md.\n\n")
    fh.write("| Time | Kind | Value | Note |\n|---|---|---|---|\n")
    for t0, kind, val, note in rows:
        fh.write(f"| {t0:7.2f} | {kind} | {val} | {note} |\n")
counts = {}
for r in rows:
    counts[r[1]] = counts.get(r[1], 0) + 1
print(f"autoscan {total:.1f}s: " + (", ".join(f"{v} {k}" for k, v in sorted(counts.items())) or "no candidates")
      + f" ({quiet_reads} narrated holds of 2 to 6 s not listed) -> {os.path.join(qa, 'autoscan.md')}")
