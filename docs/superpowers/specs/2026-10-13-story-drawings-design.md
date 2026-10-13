# Story drawings — design

Motion phase 1, second attempt. The first attempt (scroll-assembled drawings, `2026-10-13-scroll-assembly-design.md`) shipped and was reverted the same day. It changed how the drawings were presented, not what they do.

## Intent

The user asked for "more advanced animations", which means the animations themselves should be richer.

- **Each drawing tells its product's story** as a short loop: what the product does, shown in a few beats.
- **Things that are fundamentally objects are drawn as real 3D wireframes:** the phone, the vault, the scan volume. They turn a little into a final 3/4 view as they draw in, then hold. Flat things stay flat: the comic page.
- **The finish is solid, not sketchy.** Bodies read as whole objects: the front face hides what is behind it, and back outlines are full ink. Status icons and small details are complete.
- **It's fast.** A drawing is finished in about 1.5 s, and story loops run about 4 s.

The approved reference is the chauffeur spike on branch `spike/chauffeur-story` (final commit `0e093c4`, GIF `chauffeur-3d-v5.gif`). That branch is throwaway. This spec re-implements it properly and extends it to the other three drawings.

**Decided with the user:**
- 3D only where the subject is really 3D.
- A short turn into a final view, not continuous rotation.
- Faster than the existing draw-in.
- No pencil pass.
- The back outline in full ink.
- A thinner phone body (16 units deep on a 260-unit-tall phone).
- Proper battery and signal icons.

## What a visitor sees (home page, motion allowed, JS on)

All four drawings share the same steps:
1. **Arrival.** When a sheet scrolls into view (the existing 35% visibility trigger), the drawing draws in at double the current speed. Strokes keep the engine's length-weighted order. Ink lands heavier (2.8) and settles to its weight over 400 ms.
2. **Turn.** 3D drawings turn from a start pose to their final 3/4 pose over `min(draw end, 1800 ms)` with an ease-out cubic, then hold. There is no idle rotation.
3. **Story.** Once drawn, the story loop runs while the drawing is on screen (the existing `data-live` gating). Every part of one drawing's loop shares one `--loop` clock, so the beats are coordinated.

### chauffeur — phone (3D)

Exactly as approved in the spike:
- **Model:**
  - **Body:** orthographic projection, depth 16 (`HALF = 8`).
  - **Outlines:** the back outline is full ink at a fixed width of 1.35. The front and back outlines are joined by every second outline point, forming the edge band.
  - **Side buttons and camera:** side buttons are boxes 6 deep, and the camera bump is on the back.
  - **Face:** the front face is filled with `--color-ink`, so it occludes the body behind it.
- **Turn:** yaw −12° → −30°, pitch 5° → 10°.
- **Story, 4.2 s:**
  1. The cursor glides in and taps; the button dips and turns signal orange, and ripples spread.
  2. Field 1 types, then field 2, and the checkbox ticks.
  3. "1 CHANGE" flashes as a pulse runs up the leader, and NO EFFECT thumps.
  4. The counter glitches back to "0 CHANGES", the fields wipe and the cursor leaves.
- **Leader line:** it follows the projected button.
- **Icons:** the battery has a full-weight outline, a nub and a charge fill; the signal bars are full weight.

### mri-viewer — scan volume and phone (3D)

- **Model:**
  - The slice stack becomes a real 3D box of 5 slice planes; it is currently hand-drawn as an isometric box.
  - The phone viewer beside it is a thin 3D body like chauffeur's, with the same occluding face.
- **Turn:** a short turn into a 3/4 view where the stack's depth reads clearly and the phone faces mostly forward.
- **Story, about 4.5 s:**
  1. A signal-orange highlight plane slides down through the stack.
  2. The slice it passes through is outlined in the stack, and the phone screen's scan image steps along with it: the existing `vp-a/b/c` frames, timed to the plane.
  3. "SLICE n/232" steps in time with the plane, using stacked text frames (see CSS).
  4. The window/level knob on the phone nudges as each slice lands.
  5. The plane fades out at the bottom and the loop restarts at the top.
- **Labels:** "BRIDGE" and "AXIAL · T2" stay as flat callouts with leaders that follow their projected anchors.

### myne — vault and passport (3D)

- **Model:**
  - The vault door is a thick cylinder: front ring, back ring, an edge band, the bolt bosses on the front face, and the handle hub with three spokes.
  - The hinge block on the left is a box.
  - The passport is a thin slab (a cover with page-block thickness) standing beside the door.
- **Turn:** a short turn showing the door's thickness and the passport's edge.
- **Story, about 4.5 s:**
  1. The handle spins a quarter turn and the eight bolts retract inward.
  2. The door swings open about 25° on its hinge. This is a 3D rotation of the door model about the hinge axis.
  3. A signal-orange check stamps onto the passport; it has a stamp-like scale and rotate thump.
  4. "16,830 RECORDS" ticks to 16,831.
  5. The door swings shut, the bolts extend, and the counter returns to 16,830.
- **Labels:** "VAULT", "PASSPORT" and "Ø 190" stay as flat callouts.

### hard-pills — comic page (flat, story only)

- **No 3D.** The page is flat.
- **Story, about 4.5 s:**
  1. The panels ink in one at a time, as if being drawn: borders first, then contents.
  2. The POW burst pops (scale overshoot) and the pill wobbles.
  3. The halftone fills in.
  4. The "LATER…" panel's arc draws.
  5. The page holds, then the panel contents fade back to their borders and the loop repeats.
- **Labels:** "ISSUE 01" and "P. 04" stay static.

## Everyone else

| Visitor or page | What they get |
|---|---|
| Reduced motion | Final pose, drawn, no turn, no loops (today's rule: nothing animates) |
| No JS | Final pose (rendered at build time), drawn, static |
| `html.restored` (Back, "All work") | Final pose, drawn instantly, loops run when on screen (as today) |
| `/work/*` header drawings | Final pose, drawn at first paint (the morph target), loops as today |
| Print | Final pose, drawn |

All of these show the same final 3D view, so the home ↔ project morph has the same shape at both ends.

## Architecture

### Projection at build time: `src/lib/drawings/project.ts` (new, pure TypeScript)

- **`type Vec3 = [number, number, number]`**
- **`pose(yawDeg, pitchDeg, centre: [number, number]): Pose`**
  - Orthographic: rotate about Y (yaw), then X (pitch), about `centre`.
  - `Pose.point(v: Vec3) → [x, y, depth]`.
  - `Pose.plane(z) → [a, b, c, d, e, f]`, the affine matrix mapping the 2D plane at depth `z` into the view.
- **`edgePath(pose, pts: Vec3[]) → string`**, an SVG `d` string.
- **Shape helpers:** `roundedRect(…)`, `ring(…)`, `box(…)`, `cylinder(…)`, `band(front, back, every)`.

Each 3D drawing component defines its model as data (edges with width and dim options, plus anchored planes). It renders:
- `<g class="wire">` with one `<path class="stroke …" pathLength="1" d={edgePath(final, pts)} data-pts={json}>` per edge
- `<g class="face" transform="matrix(…final…)">` for each mapped plane, holding the existing 2D artwork
- callout leaders whose start points are projected anchors

So the final pose is in the HTML: no JS is needed to see the 3D drawing.

### Turn and story at runtime: `src/lib/client/models.js` (new, home only)

- **What it reads:** for each `svg[data-model]`, the edges' `data-pts`, each plane's `data-plane` (its depth), the leaders' `data-anchor`, and the `data-from`/`data-to` poses.
- **Turn:** it re-projects every frame of the turn and stops when the turn is done.
- **Myne's door:** an extra `data-hinge` group rotates about its hinge axis while live.
- **Loading:** only the home page loads it (`<script defer>` in `src/routes/+page.svelte`), as a fingerprinted `?url` asset like `enhance.js`.
- **Hand-off from the engine:** `enhance.js` raises a `draw:start` event on the figure, with `detail.end` = draw end in ms, and `models.js` starts the turn on it. If `models.js` is absent, nothing turns, and the SSR final pose shows.
- **Budget:** at most 1.5 KB gzipped. `/work/*` pages don't load it, so their 4,096 B budget is unaffected.

### Engine, `src/lib/client/enhance.js`

- `choreograph(fig, start, k)` gains the speed factor `k`. Story figures (`svg.story`) use `k = 0.5`.
- It dispatches `draw:start`.
- Count-ups that a story keeps animating (mri SLICE, myne RECORDS) move to CSS stepped counters inside the loop.
- `enhance.js` stays within 3,584 B gzipped.

### CSS, `src/app.css`

- **Ink settle:** story strokes start at width 2.8 and settle to their weight.
- **Per-drawing loops:** `@keyframes` on one `--loop` clock per drawing, under `[data-draw][data-live] svg.story`.
- **`.face-fill`** occludes the body.
- **Stepped counters** are stacked `<text>` frames (e.g. `SLICE 115/232` … `SLICE 119/232`, `16,830 RECORDS` / `16,831 RECORDS`) with stepped opacity keyframes on the loop clock, the same technique `vp-a/b/c` already use. SVG `text` can't render CSS `::after` counters, and JS text writes would put the loop on the main thread.
- **Reduced motion:** the existing block extends to the new loop classes (nothing runs).

### Removed

The old `.layer` depth groups and their pointer parallax are removed in 3D drawings, where the turn replaces them. They stay in hard-pills.

## Error handling and edge cases

- **`models.js` blocked or late:** the SSR final pose shows and nothing turns. The story loops still run (CSS).
- **`enhance.js` blocked:** the existing 2.5 s fallback drops `html.js`, so drawings render finished in the final pose.
- **A drawing scrolled away mid-turn:** the turn finishes regardless (≤ 1.8 s). Loops only run on screen.
- **Morph mid-turn:** the view transition snapshots the current frame. The target is the final pose, so the jump is at most the remaining turn.
- **A late `data-pts` parse error:** that model is skipped and its final pose stays.

## Testing

### Unit (vitest), `project.ts`

- An identity pose maps points to themselves.
- A 90° yaw maps +Z to +X.
- `plane(z)` agrees with `point()` for three non-collinear points on that plane.
- `edgePath` closes the shapes it should.
- A model's final-pose SSR output is deterministic.

### E2E (Playwright)

- **SSR final pose:** with JS disabled, each 3D drawing has a `.wire` with ≥ 20 edges, a `.face` with a non-identity matrix, and a `.face-fill`. The same `d` values appear on the home page and on `/work/<slug>`.
- **Turn:** on home, a 3D drawing's face matrix changes after the drawing starts and settles to the SSR value (within 0.01) by 2 s. Under reduced motion it never changes.
- **Speed:** the last stroke's `--t + --d` for a story figure is ≤ 1,600 ms.
- **Stories:** for each drawing, the named loop parts get running animations only while `data-live` is set, and every part's `animation-duration` equals its drawing's `--loop`.
- **Per-drawing beats:**
  - chauffeur: `.st-one` is visible at about 50% of the loop and hidden at 70%.
  - mri: the highlight plane's position correlates with the visible viewer frame.
  - myne: the door's hinge rotation is non-zero at about 40% of the loop.
  - hard-pills: the panel borders have finished drawing before their contents.
- **Leaders:** the leader start lies within 1 unit of the projected anchor at the final pose.
- **Budgets:**
  - home first-load JS < 30 KB
  - `models.js` < 1.5 KB gzipped
  - `enhance.js` < 3,584 B
  - `/work/*` < 4,096 B (they must not load `models.js`)
- **Regression:** the existing drawings, motion, work, work-pages and hero specs stay green, with the timed-draw expectations updated for `k = 0.5` where they assert absolute timings.
- **Visual review gate:** before merge, one GIF per drawing goes to the user for approval, recorded as in the spike.

### Post-deploy

Live Lighthouse: home 100 in all four categories with CLS 0; `/work/*` ≥ 95.

## Out of scope (later phases)

- **Page-wide choreography:** hero, section rules and type timed with the drawings. Next spec.
- **Cursor or touch interaction with the 3D models.**
- Any scroll-driven presentation.
