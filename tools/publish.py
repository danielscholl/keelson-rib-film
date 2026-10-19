#!/usr/bin/env python3
"""Stage a finished short for the web: an mp4, a poster, a card thumbnail and captions.

Usage: publish.py <short-dir>
Reads final.mp4 (and final.srt) from the short and writes into the library, where the series.yaml
`publish` block says: `dir: "media/{series}/{prefix}-{fig}"` and optionally `file: "{prefix}-{fig}.mp4"`
(default <dir name>.mp4), keys filled from the manifest; {series} is the manifest's series, else the
series folder's name. A series with no publish block cannot publish.
`thumb: <seconds>` in the manifest picks the thumbnail frame (default 42% in). It never pushes.
"""
import os, re, subprocess, sys

import yaml
from filmlib import library_root, series_config

if len(sys.argv) != 2:
    raise SystemExit(__doc__)
d = os.path.abspath(sys.argv[1])
M = yaml.safe_load(open(os.path.join(d, "short.yaml"))) or {}
lib = library_root(d)
S, sdir = series_config(d, lib, with_dir=True)
pub = S.get("publish") or {}
if not pub.get("dir"):
    raise SystemExit(f"no publish target: add a publish block to the series.yaml above {d}, e.g.\n"
                     "publish:\n  dir: media/{series}/{prefix}-{fig}")
series_id = M.get("series") or (os.path.basename(sdir) if sdir else "")


def fill(template):
    keys = {**M, "series": series_id}
    try:
        return re.sub(r"\{(\w+)\}", lambda m: str(keys[m.group(1)]), template)
    except KeyError as e:
        raise SystemExit(f"publish template {template!r} needs {e.args[0]!r} in short.yaml")


out = os.path.join(lib, fill(pub["dir"]))
video = fill(pub["file"]) if pub.get("file") else f"{os.path.basename(out)}.mp4"
os.makedirs(out, exist_ok=True)
src, mp4 = os.path.join(d, "final.mp4"), os.path.join(out, video)
ff = ["ffmpeg", "-nostdin", "-loglevel", "error", "-y"]
subprocess.run(ff + ["-i", src, "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p",
                     "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", mp4], check=True)
subprocess.run(ff + ["-ss", "6", "-i", src, "-frames:v", "1", "-vf", "scale=1280:-1", "-q:v", "3",
                     os.path.join(out, "poster.jpg")], check=True)
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4],
                           capture_output=True, text=True, check=True).stdout)
thumb = M.get("thumb", round(dur * 0.42, 2))
subprocess.run(ff + ["-ss", str(thumb), "-i", mp4, "-frames:v", "1", "-vf", "scale=640:-1", "-q:v", "4",
                     os.path.join(out, "thumb.jpg")], check=True)
if os.path.exists(os.path.join(d, "final.srt")):
    subprocess.run(ff + ["-i", os.path.join(d, "final.srt"), os.path.join(out, "captions.vtt")], check=True)
print(f"{os.path.relpath(mp4, lib)}: {os.path.getsize(mp4) / 1e6:.1f} MB")
