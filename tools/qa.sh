#!/usr/bin/env bash
# Usage: [PHONE=t] qa.sh video.mp4 t1 t2 ... (up to 9 timestamps, seconds)
# Writes <video>.qa.png (contact sheet), prints silence gaps over 0.8s and integrated loudness.
set -euo pipefail
v="$1"; shift
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
n=0; inputs=(); labels=""
for t in "$@"; do
  ffmpeg -loglevel error -y -ss "$t" -i "$v" -frames:v 1 -vf scale=640:-1 "$tmp/$n.png"
  inputs+=(-i "$tmp/$n.png"); labels+="[$n]"; n=$((n+1))
done
cols=3; layout=""
for ((i=0; i<n; i++)); do
  x=""; y=""
  for ((c=0; c<i%cols; c++)); do x+="${x:++}w0"; done
  for ((r=0; r<i/cols; r++)); do y+="${y:++}h0"; done
  layout+="${layout:+|}${x:-0}_${y:-0}"
done
if (( n > 1 )); then
  ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex "${labels}xstack=inputs=$n:layout=$layout:fill=black" "${v%.*}.qa.png"
else
  cp "$tmp/0.png" "${v%.*}.qa.png"
fi
echo "contact sheet: ${v%.*}.qa.png"
if [[ -n "${PHONE:-}" ]]; then
  ffmpeg -loglevel error -y -ss "$PHONE" -i "$v" -frames:v 1 -vf scale=405:-1 "${v%.*}.phone.png"
  echo "phone frame (405 px wide, the size it is read at): ${v%.*}.phone.png"
fi
echo "silence gaps:"
ffmpeg -hide_banner -nostats -i "$v" -af "silencedetect=n=-40dB:d=0.8" -f null - 2>&1 \
  | grep -oE "silence_(start|end): [0-9.]+" | paste - - | awk '{printf "  %6.2f -> %6.2f  (%.1fs)\n", $2, $4, $4-$2}'
ffmpeg -hide_banner -nostats -i "$v" -af ebur128 -f null - 2>&1 | grep -A1 "Integrated loudness" | grep "I:" | sed 's/^ */loudness: /'
