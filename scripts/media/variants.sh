#!/bin/sh
# Makes a half-width "-sm" variant of every carousel image (posters excluded) for srcset.
set -e
for f in static/media/myne/*.webp static/media/mri/*.webp static/media/hard-pills/*.webp; do
  case "$f" in *-sm.webp) continue ;; esac
  out="${f%.webp}-sm.webp"
  magick "$f" -resize 50% -quality 78 "$out"
  printf '%s %s\n' "$out" "$(magick identify -format '%w %h %b' "$out")"
done
