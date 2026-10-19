#!/usr/bin/env python3
"""Generate one Veo clip through the Gemini API and save it next to its prompt.

Usage: veo.py prompt.txt out.mp4 [--model veo-3.1-fast-generate-preview] [--seconds 8] [--resolution 1080p]
                                 [--image first.png] [--last last.png] [--negative "..."]
Reads GEMINI_API_KEY. Writes out.mp4 and out.prompt.txt (model, settings, seconds taken, prompt).
--image starts the clip on that frame; --last ends it on that frame (Veo 3.1 interpolation).
"""
import argparse, base64, json, mimetypes, os, sys, time, urllib.request

p = argparse.ArgumentParser()
p.add_argument("prompt"); p.add_argument("out")
p.add_argument("--model", default="veo-3.1-fast-generate-preview")
p.add_argument("--seconds", type=int, default=8)
p.add_argument("--resolution", default="1080p")
p.add_argument("--image"); p.add_argument("--last")
p.add_argument("--negative", default="text, letters, words, logos, watermark, glow, neon, circuit board, photorealistic people")
a = p.parse_args()
KEY = os.environ["GEMINI_API_KEY"]
API = "https://generativelanguage.googleapis.com/v1beta"


def img(path):
    return {"bytesBase64Encoded": base64.b64encode(open(path, "rb").read()).decode(),
            "mimeType": mimetypes.guess_type(path)[0] or "image/png"}


def call(url, body=None):
    req = urllib.request.Request(url, json.dumps(body).encode() if body else None,
                                 {"x-goog-api-key": KEY, "Content-Type": "application/json"})
    try:
        return json.load(urllib.request.urlopen(req, timeout=120))
    except urllib.error.HTTPError as e:
        sys.exit(f"{e.code}: {e.read().decode()[:800]}")


prompt = open(a.prompt).read().strip()
inst = {"prompt": prompt}
if a.image: inst["image"] = img(a.image)
if a.last: inst["lastFrame"] = img(a.last)
params = {"aspectRatio": "16:9", "resolution": a.resolution, "durationSeconds": a.seconds,
          "negativePrompt": a.negative}
t0 = time.time()
op = call(f"{API}/models/{a.model}:predictLongRunning", {"instances": [inst], "parameters": params})
print("op", op["name"], file=sys.stderr)
while not op.get("done"):
    time.sleep(10)
    op = call(f"{API}/{op['name']}")
if "error" in op:
    sys.exit("failed: " + json.dumps(op["error"]))
resp = op["response"].get("generateVideoResponse", op["response"])
samples = resp.get("generatedSamples") or []
if not samples:
    sys.exit("no video (filtered?): " + json.dumps(resp)[:800])
uri = samples[0]["video"]["uri"]
req = urllib.request.Request(uri, headers={"x-goog-api-key": KEY})
open(a.out, "wb").write(urllib.request.urlopen(req, timeout=300).read())
dt = time.time() - t0
frames = ", ".join(f"{k} {os.path.basename(v)}" for k, v in (("first", a.image), ("last", a.last)) if v)
with open(os.path.splitext(a.out)[0] + ".prompt.txt", "w") as f:
    f.write(f"model: {a.model}, {a.seconds}s, {a.resolution}, 16:9{', ' + frames if frames else ''}, {dt:.0f}s\n"
            f"negative: {a.negative}\n\n{prompt}\n")
print(f"{a.out} ({dt:.0f}s)")
