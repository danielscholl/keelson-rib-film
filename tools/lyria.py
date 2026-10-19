#!/usr/bin/env python3
"""Generate one music clip with a Lyria model through the Gemini API and save it next to its prompt.

Usage: lyria.py prompt.txt out_base [--model lyria-3.5]   writes out_base.<ext> and out_base.prompt.txt
Reads GEMINI_API_KEY.
"""
import argparse, base64, json, mimetypes, os, sys, time, urllib.request

p = argparse.ArgumentParser()
p.add_argument("prompt"); p.add_argument("out")
p.add_argument("--model", default="lyria-3.5")
a = p.parse_args()
prompt = open(a.prompt).read().strip()
body = {"contents": [{"parts": [{"text": prompt}]}]}
url = f"https://generativelanguage.googleapis.com/v1beta/models/{a.model}:generateContent"
req = urllib.request.Request(url, json.dumps(body).encode(),
                             {"x-goog-api-key": os.environ["GEMINI_API_KEY"], "Content-Type": "application/json"})
t0 = time.time()
try:
    r = json.load(urllib.request.urlopen(req, timeout=600))
except urllib.error.HTTPError as e:
    sys.exit(f"{e.code}: {e.read().decode()[:800]}")
dt = time.time() - t0
out = None
for c in r.get("candidates", []):
    for part in c.get("content", {}).get("parts", []):
        if "inlineData" in part:
            mt = part["inlineData"].get("mimeType", "audio/wav")
            ext = {"audio/mpeg": ".mp3", "audio/mp3": ".mp3", "audio/wav": ".wav", "audio/x-wav": ".wav",
                   "audio/L16": ".pcm"}.get(mt.split(";")[0], mimetypes.guess_extension(mt.split(";")[0]) or ".bin")
            out = a.out + ext
            open(out, "wb").write(base64.b64decode(part["inlineData"]["data"]))
            print("mime", mt, file=sys.stderr)
        elif part.get("text"):
            print("model text:", part["text"][:400], file=sys.stderr)
if not out:
    sys.exit("no audio: " + json.dumps(r)[:800])
with open(a.out + ".prompt.txt", "w") as f:
    f.write(f"model: {a.model}, {dt:.0f}s\n\n{prompt}\n")
print(f"{out} ({dt:.0f}s)")
