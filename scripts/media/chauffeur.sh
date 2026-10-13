#!/bin/sh
# Re-encode chauffeur's README demo recordings for the carousel. Usage: scripts/media/chauffeur.sh <chauffeur repo>
set -e
SRC="$1/docs/media"; OUT=static/media/chauffeur
mkdir -p "$OUT"
for n in honest race crash; do
  ffmpeg -y -loglevel error -i "$SRC/$n.mp4" -an -vf "scale=960:-2:flags=lanczos,fps=24" \
    -c:v libx264 -preset slow -crf 30 -pix_fmt yuv420p -movflags +faststart "$OUT/$n.mp4"
  mid=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/$n.mp4" | awk '{print $1*0.6}')
  ffmpeg -y -loglevel error -ss "$mid" -i "$OUT/$n.mp4" -frames:v 1 "$OUT/$n.png"
  cwebp -quiet -q 75 "$OUT/$n.png" -o "$OUT/$n.webp" && rm "$OUT/$n.png"
  printf '%s ' "$n"; ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$OUT/$n.mp4"; ls -l "$OUT/$n.mp4" | awk '{print $5}'
done
