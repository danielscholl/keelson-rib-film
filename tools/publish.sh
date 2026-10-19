#!/usr/bin/env bash
# Usage: tools/publish.sh <short-dir>
# Writes media/fig-NN/ (web mp4, poster, card thumbnail, captions) from a short's final cut, for Pages to serve.
# A manifest with `series: swarm` and `prefix: det` writes media/swarm/det-NN/det-NN.mp4 and its siblings instead;
# `thumb: <seconds>` picks the thumbnail frame (default 42% in).
set -euo pipefail
d="${1%/}"
key() { sed -n "s/^$1: *\"\{0,1\}\([A-Za-z0-9.-]*\)\"\{0,1\}.*/\1/p" "$d/short.yaml" | head -1; }
fig=$(key fig); series=$(key series); prefix=$(key prefix); thumb=$(key thumb)
name="${prefix:-fig}-$fig"
out="$(dirname "$0")/../media/${series:+$series/}$name"
mkdir -p "$out"
ffmpeg -nostdin -loglevel error -y -i "$d/final.mp4" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart "$out/$name.mp4"
ffmpeg -nostdin -loglevel error -y -ss 6 -i "$d/final.mp4" -frames:v 1 -vf scale=1280:-1 -q:v 3 "$out/poster.jpg"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out/$name.mp4")
ffmpeg -nostdin -loglevel error -y -ss "${thumb:-$(python3 -c "print(round($dur * 0.42, 2))")}" -i "$out/$name.mp4" -frames:v 1 \
  -vf scale=640:-1 -q:v 4 "$out/thumb.jpg"
[ -f "$d/final.srt" ] && ffmpeg -nostdin -loglevel error -y -i "$d/final.srt" "$out/captions.vtt"
echo "media/${series:+$series/}$name: $(du -h "$out/$name.mp4" | cut -f1)"
