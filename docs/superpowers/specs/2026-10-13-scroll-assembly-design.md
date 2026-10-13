# Scroll-assembled drawings — design

> **Reverted (2026-10-13, `4563884`).** This shipped and was removed the same day: it changed how the drawings were presented, not what they do. Superseded by `2026-10-13-story-drawings-design.md`.

Phase 1 of 3 in the "next-level motion" roadmap:

1. **Scroll-driven story** (this spec): the exploded-blueprint set piece.
2. Cinematic transitions: the drawing flies into place and unfolds into the case study. Separate spec, later.
3. Interactive layer: cursor and touch reactions. Separate spec, later.

## Intent

When a visitor scrolls the home page, each project drawing should feel like a technical drawing they assemble with the scroll wheel. The visitor stays in control: nothing hijacks scroll speed, and scrolling back up takes the drawing apart again. Today's guardrails stay in place:

- home Lighthouse 100
- `/work/*` ≥ 95
- the JS budgets
- reduced motion and no-JS rendering finished drawings
- Back/Forward restoring the finished page

**Decided with the user:** phased roadmap with this phase first; pinned set pieces (not full scrollytelling); one set piece, the exploded blueprint; pure CSS scroll timelines with today's behaviour as the fallback; whole-sheet pin on desktop, no pin on phones; real 3D, achieved by splitting layers into stacked SVGs.

## What a visitor sees

This applies in scrub mode (defined below).

- **Arriving at a sheet:**
  - The drawing is exploded: tilted back about 55° (`rotateX`) in perspective, like a plan lying on a drafting table.
  - Its layers are pulled apart along Z in proportion to their existing `--depth`: construction grid lowest, main strokes in the middle, callouts and dimensions on top.
  - Only the dashed construction layer (`.c`) is visible.
- **Scrolling through it**, the timeline runs from 0 to 100%:
  - 0–65%: the strokes draw in, in the engine's existing order and length-weighted durations, mapped to scroll instead of time. Other timed parts (`.after`, `.stamp`, `.cursor`, `.unlock`, `.slide-out`, `.grow`, type `tspan`s) take their slot in the same order.
  - 55–90%: the layers collapse onto Z = 0 and the tilt flattens to face-on.
  - 85–100%: callouts, typed labels, `[data-count]` values (at their final number) and `.live` elements fade in.
- **Pinning:**
  - On desktop (`min-width: 1024px` and `min-height: 760px`; below 1024 px wide the two-column sheet can be taller than the room a pin leaves), the whole sheet pins 10vh from the top for 50vh of scroll while this plays.
  - On smaller viewports nothing pins: the timeline is the sheet crossing the viewport.
- **Scrolling back up** reverses all of it.
- **Once assembled:** the live loops run while the drawing is on screen, as today, and the pointer parallax works.

**Everyone else gets today's behaviour, byte-for-byte in effect:**
- browsers without `animation-timeline` (Firefox)
- `prefers-reduced-motion: reduce`
- no JS, or `enhance.js` failing (the 2.5 s fallback drops `html.js`)
- `html.restored` (Back/Forward, and returning home from a project)
- `/work/*` pages, where the drawing renders `data-drawn` as the morph target
- print

## Scrub mode: one switch, decided before first paint

Scrub mode is on when all of these hold:
- `html.js:not(.restored)` matches (both classes are set by the inline head script before render)
- `@supports (animation-timeline: view())` passes
- `@media (prefers-reduced-motion: no-preference)` matches

All scrub CSS sits under those three conditions. Pin space therefore exists from first paint, so there is no layout shift.

`enhance.js` evaluates the same predicate:
- `CSS.supports('animation-timeline: view()')`
- `!reduce`
- `!restored`

When it holds, the engine uses scroll choreography instead of timed choreography. Figures already marked `data-drawn` (the `/work/*` heroes) are excluded by CSS (`:not([data-drawn])` at render time) and by the engine.

## Components

### Drawings (`src/lib/drawings/*.svelte`, all four)

- Each `<g class="layer" style="--depth: N">` becomes `<svg class="layer" viewBox="0 0 400 300" aria-hidden="true" style="--depth: N">` with the same children.
- The layers stack in a single grid cell: `.drawing .stack { display: grid }`, and `.drawing .stack > svg { grid-area: 1 / 1 }`.
- Any `<defs>`, `<mask>` or gradient moves into the layer SVG that references it. Ids stay unique per document.
- `<figure role="img" aria-label>` in `DrawOnView.svelte` stays the single accessible image.
- The finished, flat rendering must look identical to today.

### Pin (`ProjectSheet.svelte` + `app.css`)

- A wrapper `<div class="pin">` around the `<article>` carries `view-timeline: --sheet`.
- In scrub mode on desktop:
  - `.pin { padding-bottom: 50vh }`
  - `.pin > article { position: sticky; top: max(2rem, calc(50vh - <sheet height>/2)) }`
  - The centring is done with `top: 50%` plus a translate, or with an equivalent that needs no JS.
- The animation range is chosen so that 0% is the moment the sheet becomes fully visible (pinned) and 100% is the end of the pin. On phones, 0% is the sheet entering and 100% is the sheet centred, i.e. `entry 50%` to `cover 50%`. Exact range values are fixed in the plan and asserted in tests.
- The existing `view-transition-name`s stay on the article and the drawing wrapper.

### Engine (`src/lib/client/enhance.js`)

- `choreograph()` keeps computing start `t` and duration `d` per part.
- In scrub mode it also writes `--a0` and `--a1` on each part: `t / end` and `(t + d) / end`, scaled into the 0–65% drawing window.
- Count-up and the time-based `data-drawn` flip are skipped in scrub mode. `[data-count]` text keeps its server-rendered final value.
- `data-live` in scrub mode follows visibility only, because `.live` opacity is already gated by the 85–100% band.
- Pointer parallax writes the same `--px`/`--py`. The CSS moves parallax from `transform` to the independent `translate` property, so it composes with the scrub `transform`.
- Budget: `enhance.js` grows by at most about 300 B gzipped, staying within its 3,584 B budget.

### CSS (`app.css`)

- `@keyframes` for: stroke dash draw, fade-in, the layer collapse (each layer SVG from `translateZ(calc(var(--depth) * 40px))` to `none`), and the stage flatten (the `.stack` from `perspective(1200px) rotateX(55deg)` to `none`, with `transform-style: preserve-3d` in scrub mode).
- Every scrubbed element gets `animation-timeline: --sheet`, `animation-fill-mode: both` and `animation-range` built from `--a0`/`--a1` or from the fixed bands above.
- `will-change: transform` goes on layer SVGs only in scrub mode.
- `.live` loop animations are unchanged. They run on inner elements, not on the layer SVG, so they don't conflict.

## Error handling and edge cases

- **`enhance.js` blocked or late:** scrub CSS needs `html.js`, and the 2.5 s fallback removes it, so drawings render finished and the pin space collapses. Accepted: this happens only on failure.
- **Before `enhance.js` sets `--a0`/`--a1`:** parts default to `--a0: 0` and `--a1: 0.65`, so a part draws across the whole window rather than staying hidden.
- **Viewport resized across the 1024 px or 760 px thresholds:** pure CSS, so it adapts. No JS state depends on it.
- **Clicking a sheet mid-assembly:** the view transition morphs the partly exploded drawing into the flat one. No special handling.
- **Sheet taller than the viewport:** no pin, because of the `min-height` gate.

## Testing (Playwright, Chromium; vitest where pure)

- **Assembly scrubs with scroll.** At about 0%, 50% and 100% of a sheet's range:
  - the computed `transform` of the top layer SVG goes exploded → partial → `none`
  - a known stroke's `stroke-dashoffset` goes 1 → between → 0

  Scrolling back to 0% restores the exploded state.
- **Pin geometry.** At 1280×900, the article's `getBoundingClientRect().top` stays constant (±1 px) across the pinned range. At 390×844 it changes with scroll, and `.pin` has no extra padding.
- **Fallbacks render finished and flat**, with no hidden strokes, transform `none` and no pin padding:
  - `reducedMotion: 'reduce'`
  - `html.restored` (arriving via the "All work" link)
  - `/work/*`
  - no JS
  - `animation-timeline` unsupported, simulated by a `CSS.supports` stub plus a test-only class override, or by Firefox if it's in the Playwright projects
- **Accessibility:** exactly one `role="img"` per drawing; every layer SVG is `aria-hidden`; axe has no new violations.
- **Visual parity:** a screenshot of each finished drawing (restored mode) matches the pre-change screenshot within a small pixel threshold.
- **Budget tests** for `enhance.js` and for page JS still pass.
- **Regression:** the existing `drawings`, `motion`, `work` and `hero` specs pass.
- **Post-deploy:** live Lighthouse with home at 100 in all four categories and CLS 0; `/work/*` ≥ 95.

## Out of scope

- Cinematic transitions and the interactive layer (phases 2 and 3).
- Making count-ups follow scroll.
- Firefox support for the set piece.
