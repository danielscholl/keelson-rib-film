#!/usr/bin/env python3
"""Render narration lines, one WAV per line, and time every word.

Usage: tts.py <short-dir or short.yaml or script.json> [--only n3,n6 | --changed] [--align-only] [--voice ...] [--style ...]
Lines come from short.yaml `lines` (or a script.json list): {"id", "text", optional "ssml", "voice", "style"}.
The voice comes from --voice, the line, the manifest, then the series.yaml above it; voices.py lists the engines
(Azure Speech, Azure OpenAI or Foundry, OpenAI, ElevenLabs, the system voice) and the settings each needs. With no
voice set anywhere, Azure Speech is used when it is configured, else the system voice for a draft.
"style" (or a top-level `style:`) wraps an Azure line in mstts:express-as (on MAI voices only Ethan and Harper take
one) and is the speaking instruction on the OpenAI engines. "ssml" replaces the Azure <voice> body verbatim when a
line needs a respelling, phonemes, or breaks; other engines speak "text", which the captions and word times use.
`max_pause:` (or --max-pause) shortens any pause inside a line to that many seconds and trims the ends,
before the words are timed; it is idempotent, so --align-only applies it to existing WAVs.
Writes narr/<id>.wav, narr/durations.json, and narr/words.json ({id: [[word, start, end], ...]}).
ElevenLabs times its own words. Otherwise word times come from Azure fast transcription of the rendered WAV when
Azure Speech is configured, aligned back to the known text (words the recognizer misses are interpolated), and are
spread by word length when it is not.
--align-only re-times existing WAVs without re-voicing them (takes vary between renders).
--changed voices only lines whose text, ssml, voice or style differ from narr/takes.json (or have no WAV), so
changing the engine or voice re-voices every line; --mark records the current lines there without voicing.
Settings come from the environment, or the library's .env.local.
"""
import argparse, difflib, json, os, re, subprocess, sys, urllib.request, uuid
from filmlib import library_root, load_env, series_config
from voices import key_for, missing, parse_voice, synth, take_key


p = argparse.ArgumentParser()
p.add_argument("src")
p.add_argument("--only", default="")
p.add_argument("--align-only", action="store_true")
p.add_argument("--changed", action="store_true")
p.add_argument("--mark", action="store_true")
p.add_argument("--voice")
p.add_argument("--style")
p.add_argument("--max-pause", type=float)
a = p.parse_args()

src = os.path.join(a.src, "short.yaml") if os.path.isdir(a.src) else a.src
root = os.path.dirname(os.path.abspath(src))
load_env(root)
region = os.environ.get("AZURE_AI_REGION", "eastus2")
if src.endswith((".yaml", ".yml")):
    import yaml
    man = yaml.safe_load(open(src))
    lines, voice, style = man["lines"], a.voice or man.get("voice"), a.style or man.get("style")
    voice = voice or series_config(root, library_root(root)).get("voice")
    max_pause = a.max_pause or man.get("max_pause")
else:
    lines, voice, style, max_pause = json.load(open(src)), a.voice, a.style, a.max_pause
if not voice and missing("azure"):
    voice = "system"
    print("no voice set and Azure Speech is not configured: voicing a draft with the system voice", file=sys.stderr)
voice = parse_voice(voice)
voice_of = lambda line: parse_voice(line["voice"]) if line.get("voice") else voice
style_of = lambda line: line.get("style", style)
only = set(filter(None, a.only.split(",")))
narr = os.path.join(root, "narr")
os.makedirs(narr, exist_ok=True)

take_of = lambda line: [line["text"], line.get("ssml") if voice_of(line)["engine"] == "azure" else None,
                        take_key(voice_of(line))] + ([style_of(line)] if style_of(line) else [])
takes_path = os.path.join(narr, "takes.json")
takes = json.load(open(takes_path)) if os.path.exists(takes_path) else {}
if a.mark:
    json.dump({l["id"]: take_of(l) for l in lines}, open(takes_path, "w"), indent=1)
    sys.exit(0)
if a.changed:
    only = {l["id"] for l in lines if takes.get(l["id"]) != take_of(l)
            or not os.path.exists(os.path.join(narr, f"{l['id']}.wav"))}
    print(f"changed: {','.join(sorted(only)) or 'none'}", file=sys.stderr)
    if not only:
        sys.exit(0)

todo = [l for l in lines if not only or l["id"] in only]
if not a.align_only:
    for engine in sorted({voice_of(l)["engine"] for l in todo}):
        if missing(engine):
            raise SystemExit(f"voice engine {engine} needs {missing(engine)} (environment or the library's .env.local)")
key = None if missing("azure") else key_for("speech")


def load(name):
    path = os.path.join(narr, name)
    return json.load(open(path)) if os.path.exists(path) else {}


def probe(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                                capture_output=True, text=True).stdout)


def transcribe(path):
    boundary = uuid.uuid4().hex
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"definition\"\r\n\r\n"
            + json.dumps({"locales": ["en-US"]}) + f"\r\n--{boundary}\r\nContent-Disposition: form-data; "
            f"name=\"audio\"; filename=\"line.wav\"\r\nContent-Type: audio/wav\r\n\r\n").encode()
    body += open(path, "rb").read() + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        f"https://{region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15",
        data=body, headers={"Ocp-Apim-Subscription-Key": key, "Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req) as r:
        d = json.load(r)
    return [(w["text"], w["offsetMilliseconds"] / 1000, (w["offsetMilliseconds"] + w["durationMilliseconds"]) / 1000)
            for ph in d.get("phrases", []) for w in ph.get("words", [])]


def tighten(path, cap, lead=0.1, tail=0.15, floor_db=-42.0, hop=0.01):
    import wave
    import numpy as np
    with wave.open(path) as w:
        params, sr = w.getparams(), w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32)
    n = int(sr * hop)
    m = len(x) // n
    loud = 20 * np.log10(np.sqrt((x[:m * n].reshape(m, n) ** 2).mean(1)) / 32768 + 1e-9) > floor_db
    if not loud.any():
        return
    first, last = int(np.argmax(loud)), m - 1 - int(np.argmax(loud[::-1]))
    segs, cur, j = [], max(0, first * n - int(lead * sr)), first
    while j <= last:
        if loud[j]:
            j += 1
            continue
        k = j
        while k <= last and not loud[k]:
            k += 1
        if (k - j) * hop > cap:
            segs.append((cur, j * n + int(cap / 2 * sr)))
            cur = k * n - int(cap / 2 * sr)
        j = k
    segs.append((cur, min(len(x), (last + 1) * n + int(tail * sr))))
    fade, out = int(0.01 * sr), x[segs[0][0]:segs[0][1]]
    for s, e in segs[1:]:
        ramp = np.linspace(0, 1, fade)
        out = np.concatenate([out[:-fade], out[-fade:] * (1 - ramp) + x[s:s + fade] * ramp, x[s + fade:e]])
    with wave.open(path, "wb") as w:
        w.setparams(params)
        w.writeframes(np.clip(out, -32768, 32767).astype(np.int16).tobytes())


norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())


def align(text, heard, dur):
    words = text.split()
    times = [None] * len(words)
    sm = difflib.SequenceMatcher(a=[norm(w) for w in words], b=[norm(w) for w, _, _ in heard], autojunk=False)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            times[blk.a + k] = heard[blk.b + k][1:]
    known = [i for i, t in enumerate(times) if t]
    for i, t in enumerate(times):
        if t:
            continue
        lo = max([j for j in known if j < i], default=None)
        hi = min([j for j in known if j > i], default=None)
        t0 = times[lo][1] if lo is not None else 0.0
        t1 = times[hi][0] if hi is not None else dur
        span = range((lo if lo is not None else -1) + 1, hi if hi is not None else len(words))
        chars = sum(len(words[j]) for j in span) or 1
        before = sum(len(words[j]) for j in span if j < i)
        times[i] = (t0 + (t1 - t0) * before / chars, t0 + (t1 - t0) * (before + len(words[i])) / chars)
    missed = len(words) - len(known)
    return [[w, round(s, 3), round(e, 3)] for w, (s, e) in zip(words, times)], missed


durations, words = load("durations.json"), load("words.json")
for line in todo:
    path = os.path.join(narr, f"{line['id']}.wav")
    timed = None
    if not a.align_only:
        timed = synth(voice_of(line), line, path, style_of(line))
        takes[line["id"]] = take_of(line)
    if max_pause:
        tighten(path, float(max_pause))
        timed = None
    d = probe(path)
    durations[line["id"]] = round(d, 3)
    heard = timed or (transcribe(path) if key else [])
    words[line["id"]], missed = align(line["text"], heard, d)
    note = f"  ({missed} word{'s' * (missed != 1)} interpolated)" if missed and heard else ""
    print(f"{line['id']}\t{d:.2f}s\t{line['text'][:64]}{note}", file=sys.stderr)

json.dump(durations, open(os.path.join(narr, "durations.json"), "w"), indent=1)
json.dump(words, open(os.path.join(narr, "words.json"), "w"))
json.dump(takes, open(takes_path, "w"), indent=1)
print(f"total narration {sum(durations.values()):.1f}s", file=sys.stderr)
