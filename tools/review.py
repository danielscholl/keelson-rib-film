#!/usr/bin/env python3
"""Run QA on a short's final.mp4 and write a review page for the approval gate.

Usage: review.py <short-dir> <out.md> [sheet-url-base]
Takes nine frames spread evenly between the bookends, runs qa.sh, and writes markdown with
the contact sheet inlined, the length, loudness and silence gaps, and the narration as captioned.
"""
import base64, json, os, re, subprocess, sys

import yaml

d, out = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
man = yaml.safe_load(open(os.path.join(d, "short.yaml")))
tl = json.load(open(os.path.join(d, "build/timeline.json")))
seg = tl["segments"]
first = seg["open"]["at"] + seg["open"]["dur"] if "open" in seg else 0.0
last = seg["close"]["at"] if "close" in seg else tl["total"]
span = (last - first) / 9
mids = [first + span * (i + 0.5) for i in range(9)]
picks = [(next((k for k, v in seg.items() if v["at"] <= t < v["at"] + v["dur"] and k not in ("open", "close")), "?"), t) for t in mids]
times = [f"{t:.2f}" for _, t in picks]

video = os.path.join(d, "final.mp4")
qa = subprocess.run([os.path.join(here, "qa.sh"), video, *times], capture_output=True, text=True, check=True).stdout
loud = re.search(r"loudness:\s*I:\s*(-?[\d.]+) LUFS", qa)
gaps = re.findall(r"\(([\d.]+)s\)", qa)
long_gaps = [g for g in gaps if float(g) >= 3]

jpg = os.path.join(os.path.dirname(os.path.abspath(out)), "sheet.jpg")
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", os.path.join(d, "final.qa.png"),
                "-vf", "scale=1600:-1", "-q:v", "4", jpg], check=True)
base = sys.argv[3] if len(sys.argv) > 3 else None
sheet = f"{base.rstrip('/')}/sheet.jpg" if base else "data:image/jpeg;base64," + base64.b64encode(open(jpg, "rb").read()).decode()

fig, title = man["fig"], man["title"]
lufs = float(loud.group(1)) if loud else None
ok_loud = lufs is not None and abs(lufs + 16) <= 1
rows = [
    f"| Length | {tl['total']:.1f} s |",
    f"| Loudness | {lufs if lufs is not None else 'unmeasured'} LUFS {'(target -16)' if ok_loud else '(off target -16)'} |",
    f"| Silence over 3 s | {', '.join(s + ' s' for s in long_gaps) if long_gaps else 'none'} |",
    f"| Frames | {', '.join(f'{k} at {t:.0f} s' for k, t in picks)} |",
]
said = "\n".join(f"- {l.get('text')}" for l in man["lines"])
open(out, "w").write(f"""# FIG. {fig} · {title}

<img alt="contact sheet" src="{sheet}" width="100%">

| Check | Result |
|---|---|
{chr(10).join(rows)}

## Narration

{said}
""")
print(f"FIG. {fig} {title}: {tl['total']:.1f} s, {lufs} LUFS, long gaps: {len(long_gaps)}")
