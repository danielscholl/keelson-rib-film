"""Lookups the film tools share: the library a short lives in, its series settings, and its local environment."""
import os


def library_root(start):
    """FILM_LIBRARY, else the nearest folder at or above start with assets/ or .git."""
    if os.environ.get("FILM_LIBRARY"):
        return os.path.abspath(os.environ["FILM_LIBRARY"])
    start = os.path.abspath(start)
    d = start
    while True:
        if os.path.isdir(os.path.join(d, "assets")) or os.path.exists(os.path.join(d, ".git")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return start
        d = parent


def series_config(short_root, lib, with_dir=False):
    """The nearest series.yaml above the short, up to the library root (and its folder, with_dir)."""
    import yaml
    d = os.path.dirname(os.path.abspath(short_root))
    while d.startswith(lib):
        p = os.path.join(d, "series.yaml")
        if os.path.exists(p):
            config = yaml.safe_load(open(p)) or {}
            return (config, d) if with_dir else config
        if d == lib:
            break
        d = os.path.dirname(d)
    return ({}, None) if with_dir else {}


def load_env(start="."):
    """Fill unset variables from FILM_ENV_FILE, else <library>/.env.local. Values never print."""
    path = os.environ.get("FILM_ENV_FILE") or os.path.join(library_root(start), ".env.local")
    if os.path.exists(path):
        for ln in open(path):
            k, _, v = ln.strip().partition("=")
            if k and not k.startswith("#"):
                os.environ.setdefault(k, v)


DEFAULT_TAGS = {"open": "{TITLE}", "close": "{TITLE}", "header": "{TITLE}"}


def piece_tag(kind, manifest, series):
    """A piece's on-screen tag: the open card, the close card or the footage header. A series or manifest sets
    `tags: {open, close, header}` as templates over the manifest's fields, with {title} and {TITLE} (upper case)."""
    template = {**DEFAULT_TAGS, **(series.get("tags") or {}), **(manifest.get("tags") or {})}[kind]
    title = str(manifest.get("title", ""))
    keys = {k: v for k, v in manifest.items() if isinstance(v, (str, int, float))} | {"title": title, "TITLE": title.upper()}
    try:
        return template.format_map(keys)
    except KeyError as e:
        raise SystemExit(f"tags.{kind} uses {{{e.args[0]}}}, which the manifest doesn't set")
