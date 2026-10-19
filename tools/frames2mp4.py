#!/usr/bin/env python3
"""Turn CDP screencast frames into a constant-frame-rate video.

Usage: frames2mp4.py capture_dir out.mp4 [--fps 30]
capture_dir holds frames/00000.jpg... and meta.json {"frames": [epoch_ts, ...], "marks": {"start": ts, "end": ts, ...}}.
Each output frame shows the latest captured frame at or before its time, from marks.start to marks.end,
so the video's clock matches the marks exactly.
"""
import argparse, bisect, json, os, shutil, subprocess, tempfile

p = argparse.ArgumentParser()
p.add_argument("capture_dir"); p.add_argument("out"); p.add_argument("--fps", type=int, default=30)
a = p.parse_args()

meta = json.load(open(os.path.join(a.capture_dir, "meta.json")))
frames, marks = meta["frames"], meta["marks"]
t0, t1 = marks["start"], marks["end"]
seq = tempfile.mkdtemp(prefix="seq-")
try:
    for k in range(int((t1 - t0) * a.fps)):
        i = max(0, bisect.bisect_right(frames, t0 + k / a.fps) - 1)
        os.symlink(os.path.abspath(os.path.join(a.capture_dir, "frames", f"{i:05d}.jpg")), os.path.join(seq, f"{k:05d}.jpg"))
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(a.fps), "-i", os.path.join(seq, "%05d.jpg"),
                    "-vf", "scale=1920:1080:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-crf", "16", "-preset", "slow", a.out],
                   check=True)
finally:
    shutil.rmtree(seq)
print(json.dumps({k: round(v - t0, 2) for k, v in marks.items()}))
