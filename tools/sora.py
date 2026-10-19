#!/usr/bin/env python3
"""Generate one Sora clip on Azure OpenAI and save it next to its prompt.

Usage: sora.py prompt.txt out.mp4 [--seconds 4] [--size 1280x720] [--remix VIDEO_ID]
Reads the key from AZURE_OPENAI_KEY, or fetches it with az for the Foundry resource named by AZURE_AI_RESOURCE,
AZURE_AI_GROUP and AZURE_SUBSCRIPTION_ID (environment, or tools/.env.local).
Writes out.mp4 and out.prompt.txt (model, settings, job id, prompt) so the asset stays reproducible.
--remix reworks an earlier job (kept 24 h) with the new prompt; its length and size carry over.
The deployment allows about one job at a time; run variants sequentially (429s are retried).
"""
import argparse, json, os, subprocess, sys, time, urllib.request

def _local_env(path=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.local")):
    if os.path.exists(path):
        for ln in open(path):
            k, _, v = ln.strip().partition("=")
            if k and not k.startswith("#"):
                os.environ.setdefault(k, v)


_local_env()


p = argparse.ArgumentParser()
p.add_argument("prompt"); p.add_argument("out")
p.add_argument("--seconds", default="4", choices=["4", "8", "12"])
p.add_argument("--size", default="1280x720")
p.add_argument("--model", default="sora-2")
p.add_argument("--remix", metavar="VIDEO_ID")
p.add_argument("--resource", default=os.environ.get("AZURE_AI_RESOURCE"))
p.add_argument("--group", default=os.environ.get("AZURE_AI_GROUP"))
p.add_argument("--subscription", default=os.environ.get("AZURE_SUBSCRIPTION_ID"))
a = p.parse_args()

key = os.environ.get("AZURE_OPENAI_KEY") or subprocess.run(
    ["az", "cognitiveservices", "account", "keys", "list", "-g", a.group, "-n", a.resource,
     "--subscription", a.subscription, "--query", "key1", "-o", "tsv"],
    capture_output=True, text=True, check=True).stdout.strip()
base = f"https://{a.resource}.openai.azure.com/openai/v1/videos"
prompt = open(a.prompt).read().strip()


def call(url, data=None):
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data else None,
                                 headers={"api-key": key, "Content-Type": "application/json"})
    for attempt in range(6):
        try:
            return urllib.request.urlopen(req)
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 5:
                raise
        except urllib.error.URLError:
            if attempt == 5:
                raise
        time.sleep(20 * (attempt + 1))


if a.remix:
    job = json.load(call(f"{base}/{a.remix}/remix", {"prompt": prompt}))
else:
    job = json.load(call(base, {"model": a.model, "prompt": prompt, "seconds": a.seconds, "size": a.size}))
print(f"job {job['id']}", file=sys.stderr)
while job["status"] not in ("completed", "failed", "cancelled"):
    time.sleep(10)
    job = json.load(call(f"{base}/{job['id']}"))
if job["status"] != "completed":
    sys.exit(f"{job['status']}: {json.dumps(job.get('error'))}")
with call(f"{base}/{job['id']}/content") as r, open(a.out, "wb") as f:
    f.write(r.read())
with open(os.path.splitext(a.out)[0] + ".prompt.txt", "w") as f:
    shape = f"remix of {a.remix}" if a.remix else f"{a.seconds}s, {a.size}"
    f.write(f"model: {a.model}, {shape}, id {job['id']}\n\n{prompt}\n")
print(a.out)
