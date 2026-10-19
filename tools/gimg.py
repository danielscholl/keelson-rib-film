#!/usr/bin/env python3
"""Generate one image with a Gemini image model and save it next to its prompt.

Usage: gimg.py prompt.txt out.png [--model gemini-3-pro-image] [--aspect 16:9] [--size 2K] [--ref img ...]
Reads GEMINI_API_KEY. Writes out.png and out.prompt.txt (model, settings, seconds, refs, prompt).
--ref passes reference images (style or the image to edit) before the prompt.
"""
import argparse, base64, json, mimetypes, os, sys, time, urllib.request

p = argparse.ArgumentParser()
p.add_argument("prompt"); p.add_argument("out")
p.add_argument("--model", default="gemini-3-pro-image")
p.add_argument("--aspect", default="16:9")
p.add_argument("--size", default="2K")
p.add_argument("--ref", nargs="*", default=[])
a = p.parse_args()

prompt = open(a.prompt).read().strip()
parts = [{"inlineData": {"mimeType": mimetypes.guess_type(r)[0] or "image/png",
                         "data": base64.b64encode(open(r, "rb").read()).decode()}} for r in a.ref]
parts.append({"text": prompt})
img_cfg = {"aspectRatio": a.aspect}
if a.size and "2.5" not in a.model:
    img_cfg["imageSize"] = a.size
body = {"contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"], "imageConfig": img_cfg}}
url = f"https://generativelanguage.googleapis.com/v1beta/models/{a.model}:generateContent"
req = urllib.request.Request(url, json.dumps(body).encode(),
                             {"x-goog-api-key": os.environ["GEMINI_API_KEY"], "Content-Type": "application/json"})
t0 = time.time()
try:
    r = json.load(urllib.request.urlopen(req, timeout=300))
except urllib.error.HTTPError as e:
    sys.exit(f"{e.code}: {e.read().decode()[:600]}")
dt = time.time() - t0
img = None
for c in r.get("candidates", []):
    for part in c.get("content", {}).get("parts", []):
        if "inlineData" in part:
            img = part["inlineData"]["data"]
        elif part.get("text"):
            print("model text:", part["text"][:300], file=sys.stderr)
if not img:
    sys.exit("no image: " + json.dumps(r)[:600])
open(a.out, "wb").write(base64.b64decode(img))
refs = ", refs " + ", ".join(os.path.basename(x) for x in a.ref) if a.ref else ""
with open(os.path.splitext(a.out)[0] + ".prompt.txt", "w") as f:
    f.write(f"model: {a.model}, aspect {a.aspect}, size {a.size}{refs}, {dt:.0f}s\n\n{prompt}\n")
print(f"{a.out} ({dt:.0f}s)")
