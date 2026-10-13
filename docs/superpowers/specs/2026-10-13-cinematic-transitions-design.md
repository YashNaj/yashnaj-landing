# Cinematic transitions — design

Motion roadmap phase 2. Phase 1 shipped the story drawings; phase 3 (interactive layer) follows. This phase rewrites the page-to-page morph that already ships (`src/app.css` "Cross-document morph", `src/app.html` `pagereveal` script).

## Intent

**Decided with the user:** "the drawing leads". Opening a project should feel like the project's drawing carrying you into its case study, with the home page folding away behind it. The whole move stays under about 800 ms ("Shorter"), and the case study arrives in two beats rather than many.

**Constraints that stay in force:**
- **Lighthouse targets:** home 100, `/work/*` ≥ 95.
- **JS budget:** `/work/*` pages stay under 4,096 B gzipped. They're at 3,216 B today, and the head script counts toward it.
- **Reduced motion:** no transition animations at all.
- **Return trips** (Back, "All work") land on finished drawings.
- **Browsers without cross-document view transitions** (Firefox today) get a normal page load.

## What a visitor sees

### Home → project ("forward"), ≤ 800 ms

| Time | What happens |
|---|---|
| 0–250 ms | The home page folds away: its snapshot tilts back (`rotateX` about 10° in perspective), rises about 24 px, shrinks to 0.97 and fades out. |
| 0–550 ms | The clicked drawing glides from its sheet to the case-study header (the existing shared `drawing-<slug>` name). It lifts as it travels: a scale peak of about 1.04 and a soft signal-coloured glow, both gone by the time it lands. The arriving snapshot settles with a small 3D turn: `perspective(900px) rotateY(8deg)` to `none`, easing out. |
| 0–500 ms | The sheet frame morphs into the header frame (existing `sheet-<slug>`, shortened from 560 ms to 500 ms). |
| 0–480 ms | The title morphs (existing `title-<slug>`). |
| 350–650 ms | **Beat 1:** the header text block (`case-head-<slug>`: tagline, metric, stack, links) rises 12 px and fades in. |
| 450–800 ms | **Beat 2:** everything below the header (`case-body-<slug>`: gallery, write-up, prev/next) rises 20 px and fades in. |

### Project → home ("back"), ≤ 600 ms

| Time | What happens |
|---|---|
| 0–200 ms | The case study's two beats fade out quickly. |
| 0–450 ms | The drawing glides back into its sheet, with no settle turn. |
| 100–550 ms | The home page rises back into place from slightly above (reverse of the fold) and fades in. |

The home drawings are already finished on arrival (`html.restored`, unchanged).

### Project → project (prev/next, "next" or "prev"), ≤ 500 ms

The outgoing project's drawing, sheet and title slide out 40 px toward where you're coming from, and fade. The incoming ones slide in 40 px from the side you're heading to. "Next" moves leftward, as if flipping forward through a set of sheets; "prev" mirrors it. These elements have different names on each page (each name includes the slug), so every group is one-sided and gets its own exit or entry animation.

### Everyone else

| Who | What they get |
|---|---|
| `prefers-reduced-motion: reduce` | All view-transition pseudo-elements `animation: none` (the existing rule, kept): an instant swap. |
| No cross-document view transitions | A normal navigation. |
| No JS | The CSS-only parts still run in supporting browsers, because `@view-transition` is CSS. The direction types are missing, so forward styling applies. |

## How it's built

### CSS only, in `src/app.css` (replaces the "Cross-document morph" block)

- **Navigation:** `@view-transition { navigation: auto; }` stays.
- **Old root (forward):** `vt-fold` keyframes, 250 ms.
- **New root (forward):** a quick fade, 250 ms. The root is only the background and the "← All work" link.
- **Drawing:**
  - `::view-transition-group(*.vt-drawing)`: 550 ms, no delay.
  - `::view-transition-image-pair(*.vt-drawing)`: a `vt-lift` animation (scale and `drop-shadow` peak mid-flight).
  - `::view-transition-new(*.vt-drawing)`: `vt-settle` (the rotateY settle).
- **Two beats:**
  - `::view-transition-new(*.vt-head)`: `vt-rise` 300 ms, delay 350 ms.
  - `::view-transition-new(*.vt-body)`: `vt-rise-far` 350 ms, delay 450 ms.
  - Both use `both` fill.
  - On home these names don't exist, so going back makes them exit-only. Their old snapshots fade out in 200 ms.
- **Back:** under `:active-view-transition-type(back)`:
  - the new root uses `vt-unfold` (the fold in reverse), 450 ms with a 100 ms delay;
  - the drawing group takes 450 ms;
  - there's no settle turn.
- **Next and prev:** under `:active-view-transition-type(next)` and `:active-view-transition-type(prev)`, the one-sided old and new groups of `*.vt-sheet`, `*.vt-drawing` and `*.vt-title` get `vt-slide-out-*` and `vt-slide-in-*` keyframes, 450 ms.
- **Ceiling:** every transition animation's duration plus delay is ≤ 800 ms.

### Markup, `src/routes/work/[slug]/+page.svelte`

- The header's text column (`div.min-w-0`) gets `view-transition-name: case-head-<slug>` and `view-transition-class: vt-head`.
- The gallery section, write-up grid and prev/next nav are wrapped in one `<div>` named `case-body-<slug>`, class `vt-body`. The footer stays in the root.
- **Why the names carry the slug** (amended during build): with one shared `case-head`/`case-body` name, prev/next pairs the two pages' beats and the browser morphs them. Clicked from the Next link at the page bottom, the whole body then swoops about 1,450 px through the header. With slug names the beats are one-sided on every navigation, so they slide or rise in place.
- `<main>` carries `data-vt-page="case"` (home: `"home"`), so the cinematic rules apply only where they land. The demo and 404 keep the crossfade.
- The prev and next links get `data-vt-dir="prev"` / `"next"`; "← All work" and the demo's "← Back to the project" get `data-vt-dir="back"`.

### Direction hand-off, `src/app.html` inline head script

- **On click:** a delegated listener on `[data-vt-dir]` remembers the direction and the link's URL. It ignores modified, non-primary and prevented clicks.
- **On `pageswap`:** if the committing navigation is a push to that URL, the direction is stored in `sessionStorage['vt-dir']`. An aborted click never reaches storage.
- **On arrival:** the existing `pagereveal` handler reads and clears it. If it's present, it adds that type (`next`/`prev`) instead of `forward`/`back`. Otherwise it keeps today's forward/back logic.
- **Size:** about +100 B gzipped, in the inline script that counts toward the `/work` budget.
- **Failures:** every storage access is wrapped in `try`/`catch`. If storage is blocked, the type falls back to forward/back.

## Error handling and edge cases

- **Opening a project in a new tab, or by direct URL:** there's no transition, so the page renders normally. The beat names do nothing without a transition.
- **`sessionStorage` blocked:** prev/next get the forward styling. Nothing breaks.
- **Stale `vt-dir`:** the value is written only when the click's own navigation commits, and cleared on every `pagereveal`, so it can't leak into a later navigation.
- **Mid-transition interaction:** the browser handles it, as it does today.
- **Large body snapshot on long pages:** view transitions snapshot named elements at their full size. The body is one element of a few screens, which is acceptable. Its arrival animates only `transform` and `opacity`.

## Testing

**Unit (vitest, `tests/unit/css.test.ts`):**
- Parse the view-transition block in `app.css` and assert every `animation` / `animation-duration` + `animation-delay` pair totals ≤ 800 ms.
- The reduced-motion rule still sets `animation: none` for all view-transition pseudo-elements.
- `app.html` handles `next`/`prev` from `sessionStorage` and clears it.

**E2E (Playwright, Chromium):**
- Navigation types:
  - home → project click records `forward`;
  - Back records `back`;
  - the next link records `next`;
  - the prev link records `prev`.
  - Types are captured by an init-script `pagereveal` listener that reads `e.viewTransition.types` on the next tick.
- The project page exposes `case-head-<slug>` and `case-body-<slug>` view-transition names, exactly once each.
- Existing morph and return-trip tests stay green: shared names on home and work, `html.restored`, finished drawings.
- The `/work` JS budget test stays green.

**Visual gate:** before merge, GIFs of forward, back and next go to the user, recorded with Playwright `recordVideo`.

**Post-deploy:** Lighthouse home 100 (unchanged; home's CSS grows by about 1 KB) and `/work/*` ≥ 95.

## Out of scope

- Phase 3, the interactive layer: cursor and touch reactions.
- Transitions to and from the MRI demo page and the 404 page; they keep the root crossfade.
