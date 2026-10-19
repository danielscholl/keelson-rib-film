"""Voice engines for tts.py. Each turns one line into a 48 kHz mono WAV and, when the engine can, says when each
word was spoken.

A voice is a string or a mapping. "engine:name" picks an engine; any other string is an Azure Speech voice name.
A mapping is {engine, name, model, instructions, settings}.

  azure         Azure Speech voices, MAI voices included: AZURE_SPEECH_KEY, or the key of the Foundry resource named
                by AZURE_AI_RESOURCE, AZURE_AI_GROUP and AZURE_SUBSCRIPTION_ID (fetched with az). Takes ssml and style.
  azure-openai  A speech model deployed on Azure OpenAI or a Foundry resource (model is the deployment name):
                AZURE_OPENAI_ENDPOINT or AZURE_AI_RESOURCE, and AZURE_OPENAI_KEY or the az resource settings.
  openai        OpenAI speech models: OPENAI_API_KEY.
  elevenlabs    ElevenLabs (name is the voice id): ELEVENLABS_API_KEY. Times words itself.
  system        The machine's voice (say on macOS, espeak-ng on Linux), for drafts. Needs nothing.

style and instructions become the speaking instructions on the OpenAI engines; settings are ElevenLabs voice_settings.
"""
import base64, json, os, shutil, subprocess, tempfile, urllib.request
from xml.sax.saxutils import escape

ENGINES = ("azure", "azure-openai", "openai", "elevenlabs", "system")
DEFAULT_NAMES = {"azure": "en-US-Harper:MAI-Voice-2.1", "azure-openai": "alloy", "openai": "alloy"}
DEFAULT_MODELS = {"azure-openai": "gpt-4o-mini-tts", "openai": "gpt-4o-mini-tts", "elevenlabs": "eleven_multilingual_v2"}
SYSTEM_VOICES = ("say", "espeak-ng", "espeak")


def parse_voice(spec):
    if isinstance(spec, dict):
        v = {k: x for k, x in spec.items() if x is not None}
        v.setdefault("engine", "azure")
    elif spec:
        head, _, rest = str(spec).partition(":")
        v = {"engine": head, **({"name": rest} if rest else {})} if head in ENGINES else {"engine": "azure", "name": spec}
    else:
        v = {"engine": "azure"}
    if v["engine"] not in ENGINES:
        raise SystemExit(f"unknown voice engine {v['engine']!r}; use one of {', '.join(ENGINES)}")
    if not v.get("name") and v["engine"] in DEFAULT_NAMES:
        v["name"] = DEFAULT_NAMES[v["engine"]]
    if v["engine"] == "elevenlabs" and not v.get("name"):
        raise SystemExit("an elevenlabs voice needs a name: the voice id, as elevenlabs:<voice id>")
    if v["engine"] in DEFAULT_MODELS:
        v.setdefault("model", DEFAULT_MODELS[v["engine"]])
    return v


def take_key(v):
    """What a take records about its voice. An Azure voice is its bare name, as takes made before engines recorded it."""
    if v["engine"] == "azure":
        return v["name"]
    key = f"{v['engine']}:{v['name']}" if v.get("name") else v["engine"]
    extras = {k: v[k] for k in ("model", "instructions", "settings") if v.get(k)}
    return f"{key} {json.dumps(extras, sort_keys=True)}" if extras else key


def env(name):
    return os.environ.get(name) or None


def az_key():
    resource, group, sub = env("AZURE_AI_RESOURCE"), env("AZURE_AI_GROUP"), env("AZURE_SUBSCRIPTION_ID")
    if not (resource and group and sub and shutil.which("az")):
        return None
    return subprocess.run(["az", "cognitiveservices", "account", "keys", "list", "-g", group, "-n", resource,
                           "--subscription", sub, "--query", "key1", "-o", "tsv"],
                          capture_output=True, text=True, check=True).stdout.strip()


def azure_resource_set():
    return all(env(k) for k in ("AZURE_AI_RESOURCE", "AZURE_AI_GROUP", "AZURE_SUBSCRIPTION_ID")) and bool(shutil.which("az"))


def missing(engine):
    """None when the engine can run here, else what to set."""
    if engine == "azure":
        return None if env("AZURE_SPEECH_KEY") or azure_resource_set() else \
            "AZURE_SPEECH_KEY, or AZURE_AI_RESOURCE, AZURE_AI_GROUP and AZURE_SUBSCRIPTION_ID with az signed in"
    if engine == "azure-openai":
        endpoint = env("AZURE_OPENAI_ENDPOINT") or env("AZURE_AI_RESOURCE")
        return None if endpoint and (env("AZURE_OPENAI_KEY") or azure_resource_set()) else \
            "AZURE_OPENAI_ENDPOINT (or AZURE_AI_RESOURCE) and AZURE_OPENAI_KEY (or the az resource settings)"
    if engine == "openai":
        return None if env("OPENAI_API_KEY") else "OPENAI_API_KEY"
    if engine == "elevenlabs":
        return None if env("ELEVENLABS_API_KEY") else "ELEVENLABS_API_KEY"
    return None if any(shutil.which(b) for b in SYSTEM_VOICES) else "espeak-ng (the system voice on Linux)"


_keys = {}


def key_for(kind):
    if kind not in _keys:
        own = {"speech": "AZURE_SPEECH_KEY", "openai": "AZURE_OPENAI_KEY"}[kind]
        _keys[kind] = env(own) or az_key()
    return _keys[kind]


def to_wav(src, path):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-ar", "48000", "-ac", "1",
                    "-c:a", "pcm_s16le", path], check=True)


def post(url, body, headers):
    data = body if isinstance(body, bytes) else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "keelson-rib-film", **headers})
    try:
        with urllib.request.urlopen(req) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{url.split('?')[0]}: HTTP {e.code} {e.read()[:300].decode(errors='replace')}")


def words_from_chars(chars, starts, ends):
    """ElevenLabs aligns characters; join them into words split on whitespace."""
    out, word, t0, t1 = [], "", None, None
    for c, s, e in zip(chars, starts, ends):
        if c.isspace():
            if word:
                out.append((word, t0, t1))
            word, t0 = "", None
            continue
        if not word:
            t0 = s
        word, t1 = word + c, e
    if word:
        out.append((word, t0, t1))
    return out


def synth(v, line, path, style=None):
    """Voice one line into path. Returns [(word, start, end)] when the engine timed the words, else None."""
    engine, text = v["engine"], line["text"]
    if engine == "azure":
        body = line.get("ssml") or escape(text)
        if style:
            body = f"<mstts:express-as style='{style}'>{body}</mstts:express-as>"
        ssml = (f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' "
                f"xml:lang='en-US'><voice name='{v['name']}'>{body}</voice></speak>")
        region = env("AZURE_AI_REGION") or "eastus2"
        audio = post(f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1", ssml.encode(),
                     {"Ocp-Apim-Subscription-Key": key_for("speech"), "Content-Type": "application/ssml+xml",
                      "X-Microsoft-OutputFormat": "riff-48khz-16bit-mono-pcm"})
        open(path, "wb").write(audio)
        return None

    with tempfile.TemporaryDirectory() as tmp:
        if engine in ("azure-openai", "openai"):
            body = {"model": v["model"], "input": text, "voice": v["name"], "response_format": "wav"}
            if v.get("instructions") or style:
                body["instructions"] = v.get("instructions") or style
            if engine == "openai":
                url, headers = "https://api.openai.com/v1/audio/speech", {"Authorization": f"Bearer {env('OPENAI_API_KEY')}"}
            else:
                base = env("AZURE_OPENAI_ENDPOINT") or f"https://{env('AZURE_AI_RESOURCE')}.openai.azure.com"
                url, headers = f"{base.rstrip('/')}/openai/v1/audio/speech", {"api-key": key_for("openai")}
            raw = os.path.join(tmp, "line.wav")
            open(raw, "wb").write(post(url, body, {**headers, "Content-Type": "application/json"}))
            to_wav(raw, path)
            return None

        if engine == "elevenlabs":
            body = {"text": text, "model_id": v["model"]}
            if v.get("settings"):
                body["voice_settings"] = v["settings"]
            d = json.loads(post(f"https://api.elevenlabs.io/v1/text-to-speech/{v['name']}/with-timestamps?output_format=mp3_44100_128",
                                body, {"xi-api-key": env("ELEVENLABS_API_KEY"), "Content-Type": "application/json"}))
            # MP3 is the one output format every ElevenLabs plan allows.
            raw = os.path.join(tmp, "line.mp3")
            open(raw, "wb").write(base64.b64decode(d["audio_base64"]))
            to_wav(raw, path)
            al = d.get("alignment") or {}
            return words_from_chars(al.get("characters", []), al.get("character_start_times_seconds", []),
                                    al.get("character_end_times_seconds", [])) or None

        say = next(b for b in SYSTEM_VOICES if shutil.which(b))
        raw = os.path.join(tmp, "line.aiff" if say == "say" else "line.wav")
        cmd = [say, "-o" if say == "say" else "-w", raw] + (["-v", v["name"]] if v.get("name") else [])
        subprocess.run(cmd + [text], check=True)
        to_wav(raw, path)
        return None
