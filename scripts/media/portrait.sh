#!/bin/sh
# Hero portrait as a background plate: blueprint monochrome, edges feathering into the page (a soft alpha vignette).
# usage: scripts/media/portrait.sh <source photo> [crop WxH+X+Y]
set -e
src="$1"; crop="${2:-1200x1200+60+230}"
tmp=$(mktemp -d)
for w in 480 800; do
  out="static/img/yashal-bg-$w.webp"
  # tone: navy shadows, warm off-white highlights, held back so it sits behind the type
  magick "$src" -crop "$crop" +repage -resize "${w}x${w}" -colorspace Gray -sigmoidal-contrast 3,45% -colorspace sRGB \
    -gamma 0.85 +level-colors '#0f1d38','#c9c8c2' "$tmp/tone.png"
  # alpha: a radial falloff broken up by fine noise, so the edge dissolves rather than blurs
  # a tall ellipse (stretched radial gradient), solid in the middle
  magick -size "$((w * 14 / 10))x${w}" radial-gradient:white-black -resize "${w}x${w}!" "$tmp/g.png"
  # darken toward the edges first, so the pale wall behind doesn't ring the fade
  magick "$tmp/tone.png" \( "$tmp/g.png" -evaluate pow 0.7 -level 0%,100%,1 +level 45%,100% \) -compose Multiply -composite "$tmp/tone.png"
  # alpha: a clean, wide smoothstep feather
  magick "$tmp/g.png" -fx 'ss = max(0, min(1, (u - 0.04) / 0.62)); ss * ss * (3 - 2 * ss)' "$tmp/a.png"
  magick "$tmp/tone.png" "$tmp/a.png" -alpha off -compose CopyOpacity -composite -quality 68 -define webp:alpha-quality=75 -define webp:alpha-filter=best "$out"
  printf '%s %s\n' "$out" "$(magick identify -format '%w %h %b' "$out")"
done
rm -r "$tmp"
