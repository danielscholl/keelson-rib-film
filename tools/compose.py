#!/usr/bin/env python3
"""Compose a short from its manifest.

Usage: compose.py <short-dir> [--out final.mp4] [--cards-only] [--dry]
Reads <short-dir>/short.yaml, narr/<id>.wav (tts.py), renders cards/ with cards.mjs, and writes the
master, final.srt, and build/timeline.json (every line and mark on the master's clock).

Times in the manifest are source times: a number is seconds into the scene's source, a string is
"mark", "mark + 0.4", or "mark - 0.3" against that scene's marks, so a re-capture moves nothing by hand.
Segments run cold-open scenes (`cold: true`), open bookend, scenes in order, close bookend, each
crossfading into the next (a scene's `xfade` sets the fade out of the segment before it). The composer
refuses to render if two lines overlap or the last line runs into the fade-out.
Optional sound keys: `sfx` cues (a sfx.py voice or a file, placed so its peak lands one frame after `at`),
`duck` and `presence` on a bed (dB under every line; a 2 kHz cut out of the voice's band), and `loudness`
(a LUFS target measured in two passes; without it the mix gets the single-pass -16).
"""
import argparse, hashlib, json, os, re, subprocess, sys
import yaml
from filmlib import library_root, piece_tag, series_config

TOOLS = os.path.dirname(os.path.abspath(__file__))
VP = (128, 100, 1664, 936)
FULL = (0, 0, 1920, 1080)
AMBIENT = {"open": 0.35, "close": 0.4}

ap = argparse.ArgumentParser()
ap.add_argument("short"); ap.add_argument("--out", default="final.mp4")
ap.add_argument("--cards-only", action="store_true"); ap.add_argument("--dry", action="store_true")
args = ap.parse_args()
root = os.path.abspath(args.short)


LIB = library_root(root)
S = series_config(root, LIB)
M = yaml.safe_load(open(os.path.join(root, "short.yaml")))
for key in ("voice", "bookends", "crossfade", "captions", "caption_tone", "loudness", "canvas"):
    if key not in M and key in S:
        M[key] = S[key]
THEME = {**(S.get("theme") or {}), **(M.get("theme") or {})}
here = lambda p: p if os.path.isabs(p) else os.path.join(root, p)
CW, CH = (int(v) for v in M.get("canvas", (1920, 1080)))  # a 9:16 or 1:1 cut sets canvas; viewport frames assume 1920x1080
FULL = (0, 0, CW, CH)


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True, check=True).stdout
    return float(out)


def load_marks(spec):
    if not spec:
        return {}
    if isinstance(spec, dict):
        return dict(spec)
    d = json.load(open(here(spec)))
    if "marks" in d:
        t0 = d["marks"]["start"]
        return {k: v - t0 for k, v in d["marks"].items()}
    return d


title, X = M["title"], float(M.get("crossfade", 0.5))
book = M.get("bookends") or {}
segs = [{**s, "source": here(s["source"])} for s in M["scenes"] if s.get("cold")]


def bookend(kind, name):
    path = os.path.join(LIB, "assets", "bookends", f"{kind}-{name}.mp4")
    if not os.path.exists(path):
        raise SystemExit(f"bookend {kind}: {name!r} needs {path} (set FILM_LIBRARY if the library is elsewhere)")
    return path


if book.get("open"):
    segs.append({"id": "open", "source": bookend("open", book["open"]), "frame": "full", "bookend": True})
for s in M["scenes"]:
    if not s.get("cold"):
        segs.append({**s, "source": here(s["source"])})
if book.get("close"):
    segs.append({"id": "close", "source": bookend("close", book["close"]), "frame": "full", "bookend": True,
                 **({"xfade": book["xfade"]} if "xfade" in book else {})})
by_id = {s["id"]: s for s in segs}

for s in segs:
    s["marks"] = load_marks(s.get("marks"))
    length = probe(s["source"])
    s["marks"].setdefault("start", 0.0)
    s["marks"].setdefault("end", length)


def src_time(seg, expr):
    if isinstance(expr, (int, float)):
        return float(expr)
    m = re.fullmatch(r"\s*([\w.-]+)\s*(?:([+-])\s*([\d.]+))?\s*", str(expr))
    if not m:
        raise SystemExit(f"bad time {expr!r} in scene {seg['id']}")
    name, sign, off = m.groups()
    if name not in seg["marks"]:
        try:
            base = float(name)
        except ValueError:
            raise SystemExit(f"scene {seg['id']} has no mark {name!r}; marks: {sorted(seg['marks'])}")
    else:
        base = seg["marks"][name]
    return base + (float(off) if sign == "+" else -float(off) if sign else 0.0)


t = 0.0
for i, s in enumerate(segs):
    a, b = (src_time(s, e) for e in s.get("trim", ["start", "end"]))
    s["a"], s["b"], s["hold"] = a, b, float(s.get("hold", 0))
    s["dur"] = b - a + s["hold"]
    s["x"] = 0.0 if i == 0 else float(s.get("xfade", X))
    t = t - s["x"] if i else 0.0
    s["at"] = t
    t += s["dur"]
total = t
glob = lambda seg, expr: seg["at"] + src_time(seg, expr) - seg["a"]
local = lambda seg, expr: src_time(seg, expr) - seg["a"]

# Narration
narr_dir = os.path.join(root, "narr")
words = json.load(open(os.path.join(narr_dir, "words.json"))) if os.path.exists(os.path.join(narr_dir, "words.json")) else {}
lines = []
for ln in M["lines"]:
    seg = by_id[ln["scene"]]
    wav = here(ln.get("wav", f"narr/{ln['id']}.wav"))
    start = glob(seg, ln["at"])
    cap = ln.get("caption", M.get("captions", True) and not seg.get("bookend"))
    lines.append({**ln, "wav": wav, "start": start, "dur": probe(wav), "caption": cap,
                  "rect": VP if seg.get("frame") == "viewport" else FULL})
lines.sort(key=lambda l: l["start"])
for p, q in zip(lines, lines[1:]):
    if p["start"] + p["dur"] > q["start"] + 0.01:
        raise SystemExit(f"{p['id']} ends at {p['start'] + p['dur']:.2f}s but {q['id']} starts at {q['start']:.2f}s")
if lines and lines[-1]["start"] + lines[-1]["dur"] > total - 0.4:
    raise SystemExit(f"{lines[-1]['id']} runs into the fade-out ({total:.2f}s)")

# Cards
cards = []
figtag = {"kind": "figtag", "file": "figtag.png", "text": piece_tag("open", M, S), "scene": "open"}
close_tag = piece_tag("close", M, S)
sheet = {"kind": "sheet", "file": "sheet.png", "text": close_tag, "title": "" if title.upper() in close_tag.upper() else title,
         "scene": "close"}
for c in M.get("cards", []):
    if c["kind"] == "figtag":
        figtag |= c
    elif c["kind"] == "sheet":
        sheet |= c
    else:
        cards.append(c)
overlays = []  # (file, t0, t1, fade)
if "open" in by_id:
    o = by_id["open"]
    overlays.append(("figtag.png", o["at"] + figtag.get("from", 0.5), o["at"] + figtag.get("to", o["dur"] - 1.1), 0.6))
if "close" in by_id:
    c = by_id["close"]
    overlays.append(("sheet.png", c["at"] + sheet.get("from", 1.4), total, 0.6))
render = [figtag, sheet]
for s in segs:
    if s.get("frame") == "viewport":
        render.append({"kind": "viewport", "file": f"viewport-{s['id']}.png", "rect": VP,
                       "header": M.get("viewport_header", (f"<b>{THEME['brand']}</b> &nbsp;·&nbsp; " if THEME.get("brand") else "")
                                       + piece_tag("header", M, S).replace(" · ", " &nbsp;·&nbsp; ")),
                       "label": s.get("label", "")})
tone = M.get("caption_tone", "light")
for k, ln in enumerate(lines):
    if not ln["caption"]:
        continue
    render.append({"kind": "caption", "file": f"cap-{ln['id']}.png", "text": ln["text"], "rect": ln["rect"], "tone": tone})
    nxt = lines[k + 1]["start"] if k + 1 < len(lines) else total
    overlays.append((f"cap-{ln['id']}.png", ln["start"], min(ln["start"] + ln["dur"] + 0.15, nxt), 0.15))
for k, c in enumerate(cards):
    seg = by_id[c["scene"]]
    render.append({**c, "file": f"callout-{k}.png"})
    overlays.append((f"callout-{k}.png", glob(seg, c["at"]), glob(seg, c["until"]) if "until" in c else seg["at"] + seg["dur"], 0.25))

card_dir = os.path.join(root, "cards")
build = os.path.join(root, "build")
os.makedirs(build, exist_ok=True)
spec = {"out": card_dir, "cards": render, "library": LIB}
if THEME:
    spec["theme"] = THEME
if os.path.isdir(os.path.join(LIB, "assets", "cards")):
    spec["kinds"] = os.path.join(LIB, "assets", "cards")
json.dump(spec, open(os.path.join(build, "cards.json"), "w"), indent=1)
if not args.dry:
    subprocess.run(["node", os.path.join(TOOLS, "cards.mjs"), os.path.join(build, "cards.json")], check=True, cwd=TOOLS)
if args.cards_only:
    sys.exit(0)


def zoom_filter(seg):
    zs = seg.get("zoom") or []
    if not zs:
        return ""
    if isinstance(zs, dict):
        zs = [zs]
    zsum, cxsum, cysum = [], [], []
    for z in zs:
        a = local(seg, z["at"]); over = float(z.get("over", 0.8))
        u = local(seg, z["until"]) if "until" in z else seg["b"] - seg["a"] + 10
        bx, by, bw, bh = z["box"]
        Z = min(CW / bw, CH / bh)
        ramp = lambda s0: f"(clip((it-{s0:.3f})/{over},0,1)*clip((it-{s0:.3f})/{over},0,1)*(3-2*clip((it-{s0:.3f})/{over},0,1)))"
        p = f"({ramp(a)}-{ramp(u)})"
        zsum.append(f"{Z - 1:.4f}*{p}")
        cxsum.append(f"{(bx + bw / 2) * 2 - CW:.1f}*{p}")
        cysum.append(f"{(by + bh / 2) * 2 - CH:.1f}*{p}")
    zexpr = "1+" + "+".join(zsum)
    cx, cy = f"{CW}+" + "+".join(cxsum), f"{CH}+" + "+".join(cysum)
    return (f",scale={CW * 2}:{CH * 2}:flags=lanczos,zoompan=z='{zexpr}':d=1:fps=30:s={CW}x{CH}"
            f":x='clip({cx}-iw/zoom/2,0,iw-iw/zoom)':y='clip({cy}-ih/zoom/2,0,ih-ih/zoom)'")


inputs, f = [], []
def add_input(*spec):
    inputs.extend(spec)
    return sum(1 for x in inputs if x == "-i") - 1


for k, s in enumerate(segs):
    vi = s["vi"] = add_input("-i", s["source"])
    rng = s.get("range", "auto")
    chain = (f"[{vi}:v]trim=start={s['a']:.3f}:end={s['b']:.3f},setpts=PTS-STARTPTS,fps=30,"
             f"scale={CW}:{CH}:flags=lanczos:in_range={rng}:out_range=tv,setsar=1,format=yuv420p")
    for m in s.get("masks", []):
        x, y, w, h = m["box"]
        en = f":enable='between(t,{local(s, m.get('from', 'start')):.3f},{local(s, m.get('to', 'end')):.3f})'"
        chain += f",drawbox=x={x}:y={y}:w={w}:h={h}:color={m.get('color', '0x0d1329')}:t=fill{en}"
    chain += zoom_filter(s)
    if s["hold"]:
        chain += f",tpad=stop_mode=clone:stop_duration={s['hold']:.3f}"
    if s.get("frame") == "viewport":
        bg = add_input("-loop", "1", "-t", f"{s['dur']:.3f}", "-i", os.path.join(card_dir, f"viewport-{s['id']}.png"))
        x, y, w, h = VP
        f.append(chain + f",scale={w}:{h}:flags=lanczos[f{k}]")
        f.append(f"[{bg}:v]fps=30,format=yuv420p[bg{k}];[bg{k}][f{k}]overlay={x}:{y}:shortest=1")
        f[-1] += f",format=yuv420p,settb=AVTB[s{k}]"
    else:
        f.append(chain + f",settb=AVTB[s{k}]")
last = "s0"
for k, s in enumerate(segs[1:], 1):
    f.append(f"[{last}][s{k}]xfade=transition=fade:duration={s['x']:.3f}:offset={s['at']:.3f}[x{k}]")
    last = f"x{k}"
for k, (file, t0, t1, fade) in enumerate(overlays):
    ci = add_input("-loop", "1", "-t", f"{total:.3f}", "-i", os.path.join(card_dir, file))
    f.append(f"[{ci}:v]format=rgba,fade=in:st={t0:.3f}:d={fade}:alpha=1,fade=out:st={max(t0, t1 - fade):.3f}:d={fade}:alpha=1[c{k}]")
    f.append(f"[{last}][c{k}]overlay=0:0:enable='between(t,{t0:.3f},{t1:.3f})'[o{k}]")
    last = f"o{k}"
f.append(f"[{last}]fade=in:st=0:d=0.3,fade=out:st={total - 0.6:.3f}:d=0.6,format=yuv420p[vout]")

A = "aresample=48000,aformat=channel_layouts=stereo"
audio_from = len(f)
mix = []
for s in segs:
    if s.get("bookend") or s.get("audio"):
        vol = float(s.get("audio", AMBIENT.get(s["id"], 0.4)))
        idx = s["vi"]
        ms = int(s["at"] * 1000)
        f.append(f"[{idx}:a]atrim=start={s['a']:.3f}:end={s['b']:.3f},asetpts=PTS-STARTPTS,{A},volume={vol},adelay={ms}|{ms}[amb{len(mix)}]")
        mix.append(f"[amb{len(mix)}]")
# Beds: music or ambience laid on the master clock under everything, before the loudness pass.
# beds: [{ file, scene, at, volume }]; `at` is a time in that scene, like a line's.
for k, bd in enumerate(M.get("beds") or []):
    seg = by_id[bd.get("scene", segs[0]["id"])]
    bi = add_input("-i", here(bd["file"]))
    ms = max(0, int(glob(seg, bd.get("at", 0)) * 1000))
    chain = f"[{bi}:a]{A},volume={float(bd.get('volume', 1.0))},adelay={ms}|{ms}"
    if "presence" in bd:
        chain += f",equalizer=f=2000:t=o:w=2:g={float(bd['presence'])}"
    if "duck" in bd and lines:
        # After adelay, t is master time: a 0.35 s smoothstep into and out of every line.
        R = 0.35
        w = "+".join(f"clip((t-{ln['start'] - R:.3f})/{R},0,1)*(1-clip((t-{ln['start'] + ln['dur']:.3f})/{R},0,1))" for ln in lines)
        chain += f",volume=eval=frame:volume='st(0,clip({w},0,1));pow(10,{float(bd['duck'])}*ld(0)*ld(0)*(3-2*ld(0))/20)'"
    f.append(chain + f"[bed{k}]")
    mix.append(f"[bed{k}]")
for k, ln in enumerate(lines):
    ni = add_input("-i", ln["wav"])
    ms = int(ln["start"] * 1000)
    f.append(f"[{ni}:a]{A},adelay={ms}|{ms}[n{k}]")
    mix.append(f"[n{k}]")


def wav_peak(path):
    """Seconds from the start of a sound file to its largest absolute sample."""
    import numpy as np
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "48000", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return float(np.argmax(np.abs(np.frombuffer(pcm, "<f4")))) / 48000


# SFX: each cue's peak lands one frame after `at`, the way a hit reads with the picture it belongs to.
placed = []
for k, cue in enumerate(M.get("sfx") or []):
    seg = by_id[cue.get("scene", segs[0]["id"])]
    snd = str(cue["sound"])
    if os.path.exists(here(snd)):
        path = here(snd)
        peak = wav_peak(path)
    else:
        os.makedirs(os.path.join(build, "sfx"), exist_ok=True)
        path = os.path.join(build, "sfx", f"{k:02d}-{snd}.wav")
        cmd = [sys.executable, os.path.join(TOOLS, "sfx.py"), snd, path, "--seed", str(cue.get("seed", 7)),
               "--pitch", str(cue.get("pitch", 0))] + (["--dur", str(cue["dur"])] if "dur" in cue else [])
        peak = float(subprocess.run(cmd, capture_output=True, text=True, check=True).stdout.strip())
    at = glob(seg, cue["at"])
    start = at + 1 / 30 - peak
    si = add_input("-i", path)
    head = f"atrim=start={-start:.4f},asetpts=PTS-STARTPTS," if start < 0 else ""
    d = max(0, round(start * 48000))
    f.append(f"[{si}:a]{head}{A},volume={float(cue.get('gain', -12))}dB,adelay={d}S|{d}S[sfx{k}]")
    mix.append(f"[sfx{k}]")
    placed.append({"sound": snd, "at": round(at, 3), "peak": round(at + 1 / 30, 3), "start": round(max(start, 0), 4),
                   "gain": float(cue.get("gain", -12))})

target = M.get("loudness")
pre = f"{''.join(mix)}amix=inputs={len(mix)}:normalize=0:duration=longest,apad,atrim=duration={total:.3f},"
if target is None:
    f.append(pre + f"loudnorm=I=-16:TP=-1.5:LRA=11,{A}[aout]")
else:
    target = float(target)
    tp = -2.0  # AAC overshoots loudnorm by about 0.8 dB; this keeps the encoded true peak under -1
    norm = f"loudnorm=I={target}:TP={tp}:LRA=11"
    if not args.dry:
        measure = f[audio_from:] + [pre + f"{norm}:print_format=json[aout]"]
        open(os.path.join(build, "loudness-measure.txt"), "w").write(";\n".join(measure))
        err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-y", *inputs, "-/filter_complex",
                              os.path.join(build, "loudness-measure.txt"), "-map", "[aout]", "-f", "null", "-"],
                             capture_output=True, text=True, check=True).stderr
        m = json.loads(err[err.rindex("{"):err.rindex("}") + 1])
        lra = max(11.0, float(m["input_lra"]) + 0.1)
        norm = (f"loudnorm=I={target}:TP={tp}:LRA={lra:.1f}:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
                f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    f.append(pre + f"{norm},{A}[aout]")


def srt_time(x):
    ms = int(round(x * 1000))
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


with open(os.path.join(root, os.path.splitext(args.out)[0] + ".srt"), "w") as fh:
    for k, ln in enumerate(lines, 1):
        fh.write(f"{k}\n{srt_time(ln['start'])} --> {srt_time(ln['start'] + ln['dur'])}\n{ln['text']}\n\n")
timeline = {"total": round(total, 3),
            "segments": {s["id"]: {"at": round(s["at"], 3), "dur": round(s["dur"], 3)} for s in segs},
            "lines": {ln["id"]: {"start": round(ln["start"], 3), "end": round(ln["start"] + ln["dur"], 3),
                                 "words": [[w, round(ln["start"] + s0, 3), round(ln["start"] + e0, 3)] for w, s0, e0 in words.get(ln["id"], [])]}
                      for ln in lines}}
if placed:
    timeline["sfx"] = placed
json.dump(timeline, open(os.path.join(build, "timeline.json"), "w"), indent=1)
open(os.path.join(build, "filter.txt"), "w").write(";\n".join(f))

print(f"total {total:.2f}s  " + "  ".join(f"{s['id']}@{s['at']:.2f}" for s in segs), file=sys.stderr)
for p, q in zip(lines, lines[1:] + [None]):
    gap = (q["start"] if q else total) - (p["start"] + p["dur"])
    print(f"  {p['id']:>4} {p['start']:6.2f} → {p['start'] + p['dur']:6.2f}   gap after {gap:4.1f}s", file=sys.stderr)
if args.dry:
    sys.exit(0)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *inputs, "-/filter_complex", os.path.join(build, "filter.txt"),
                "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
                "-color_range", "tv", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", f"{total:.3f}",
                os.path.join(root, args.out)], check=True)

# The cut record: what this master was made from, so a later change to any of it reads as stale.
# Captures and bookends are recorded by size; hashing gigabytes of footage on every cut costs too much.
BIG = 32 * 1024 * 1024


def fingerprint(path):
    size = os.path.getsize(path)
    if size > BIG:
        return f"size:{size}"
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


used = {os.path.join(root, "short.yaml")}
for dirpath, _, files in os.walk(os.path.join(root, "source")):
    used.update(os.path.join(dirpath, n) for n in files)
used.update(ln["wav"] for ln in lines)
used.update(s["source"] for s in segs)
inputs_rec = {}
for path in sorted(used):
    if os.path.exists(path):
        key = os.path.relpath(path, root) if path.startswith(root + os.sep) else path
        inputs_rec[key] = fingerprint(path)
json.dump({"out": args.out, "inputs": inputs_rec}, open(os.path.join(build, "cut.json"), "w"), indent=1)
print(os.path.join(root, args.out))
