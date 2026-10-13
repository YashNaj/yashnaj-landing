# Visual & Motion Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the site's look and motion — four far more intricate, choreographed blueprint drawings that stay subtly alive, plus a tighter visual system (texture, type, drafting frames, buttons) and more considered page-level motion (hero entrance, directional morph, scroll reveals, a depth-aware carousel) — without hurting Lighthouse, accessibility or reduced-motion users.

**Prerequisite:** `docs/superpowers/plans/2026-10-13-polish.md` is executed first (client scripts live in `src/lib/client/enhance.js` and `src/lib/client/carousel.js`, imported with `?url`).

**Architecture:** All motion is CSS (transitions, keyframes, view transitions, scroll-driven animations) driven by state attributes. `enhance.js` grows into a small "drawing engine": it measures each stroke's real length to set its duration, sequences every part of a drawing (`--t`), types labels letter by letter, counts dimension values up, toggles idle loops only while a drawing is on screen (`data-live`) and adds pointer parallax across depth layers. Drawings are rewritten as layered SVGs (construction → structure → annotation → live).

**Tech Stack:** existing; no new dependencies. Media for review: Playwright video + `ffmpeg`, `magick`.

**Spec:** none upstream — the **Design notes** below are this plan's spec (approved by reviewing this plan).

---

## Design notes (spec)

**References and what we take from them**
- Blueprint line-art layering ([Flavio Copes, self-drawing connection lines](https://flaviocopes.com/animated-svg-connection-lines/)): a faint dashed *construction* layer that appears first and stays, with solid linework drawn over it; hub-first, satellites after; triggered by IntersectionObserver.
- Stroke draw technique ([CSS-Tricks, stroke-dashoffset](https://css-tricks.com/?p=236664)): real lengths via `getTotalLength()` so long strokes take longer than short ones.
- "Wires" with travelling light ([Vercel-style wires](https://webflow.com/made-in-webflow/website/animated-svg-wires)): after drawing, short glowing dashes travel along key paths to show *flow*.
- UI motion rules (Emil Kowalski's guidance, via [skills mirror](https://skills.sh/mrmps/smry/emilkowal-animations)): ease-out by default, never ease-in for UI; interface feedback ≤ ~300 ms; marketing/explanatory motion may run longer; enter from ~0.95 scale or a small offset, never from 0; respect reduced motion.

**Motion tokens**
| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | default for UI and entrances |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | loops, pulses |
| `--ease-draw` | `cubic-bezier(0.55, 0, 0.25, 1)` | pen strokes |
| `--ease-pop` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | stamps, unlocks (slight overshoot) |
| `--dur-xs/s/m/l` | 140 / 220 / 420 / 900 ms | press / hover / reveal / showcase |

**Drawing choreography**
1. *Construction* (dashed cool-blue guides) fades in, 40 ms apart.
2. *Linework* draws in document order; each stroke's duration = `clamp(280ms, length × 2.4ms, 1400ms)`; the next stroke starts when the previous is 35% done (assembly feel).
3. *Details* (hatching, fills, labels) appear at their place in the sequence; labels type on letter by letter (32 ms/letter); dimension values count up (700 ms, ease-out cubic).
4. *Signature moment* per drawing — chauffeur: cursor glides in, taps, ripples, the NO EFFECT stamp lands; Myne: the vault dial unlocks (−120° → 0 with overshoot) as the passport slides out; MRI: slices stack back-to-front, then the viewport is wired to the stack; Hard Pills: panels ink in, halftone spreads from a point, POW! stamps.
5. *Alive* (only while on screen, never under reduced motion): chauffeur ripples + tap loop + pulse along the callout; Myne pulse along an ownership-transfer arc + foil shimmer; MRI scan sweep + viewport frames cycling in sync with the scrubber knob + pulse across the bridge; Hard Pills burst wobble, capsule bob, marching speed lines.
6. *Depth*: four layers shift with a fine pointer (−2 / 0 / 2.5 / 3.5 × 1.6 px), 600 ms ease-out.

**Visual system**
- Texture: fine film grain over everything (4.5% opacity) and a soft top-lit vignette behind content.
- Construction colour `--color-construct: rgb(150 190 255 / 0.32)` (decorative only).
- Type: `text-wrap: balance` on headings, `pretty` on paragraphs, tabular numerals for metrics and counters.
- Drafting frames: project sheets get signal corner marks that extend on hover/focus and a title-block strip (SHEET / SCALE / REV) replacing the floating sheet number.
- Buttons: one `btn-draft` style — corner ticks grow on hover/focus, 1 px lift, quick press.
- Section heads: number + label + a rule that draws in.
- Links: a dim baseline with a signal underline that sweeps in on hover/focus.

**Page motion**
- Hero: secondary elements (eyebrow, role, pitch, availability, buttons, photo corners, title block) enter staggered (12 px rise + slight blur, 70 ms apart). The `<h1>` and the photo **never animate** (they are LCP candidates). Availability dot gets a radar ping.
- Morph: directional — forward (home → project) new page rises in; Back sinks in from above; sheet, title and drawing groups get distinct durations; the project-page drawing is already complete at first paint so the morph lands on a finished drawing.
- Project pages: write-up sections and prev/next nav reveal on scroll (never the header or the carousel — LCP).
- Carousel: continuous scroll-linked depth (scale + slight Y-rotation + media brightness) where `animation-timeline: view()` is supported, the existing class-based fallback elsewhere; counter digits tick; active dot becomes a pill; arrows nudge.

**Guardrails**
- Animate only `transform`, `opacity`, `filter`, `stroke-dashoffset`, `stroke-dasharray`, `background-size`, sizes of tiny decorative pseudo-elements.
- LCP elements (hero `<h1>`, hero photo, project header, first carousel slide) never start hidden.
- No-JS and enhance.js-failure: complete static artwork (all hidden states are gated on `html.js`, which the inline fallback drops).
- Reduced motion: no running animations or transitions on load; drawings complete.
- `enhance.js` ≤ 3.5 KB gz; existing JS budget tests stay green; Lighthouse home 100s, `/work/*` ≥ 95.

---

## Global Constraints

- Confidentiality: run `git diff --cached | grep -ciEf .confidential-terms` and the `--name-only` variant (both `0`) as their own step before each commit; never chain with commit/push.
- Commit trailer:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub
  ```
- Branch `feat/visual-motion`; merge + push only in Task 11.
- All guardrails from the design notes above.

## Review Focus

1. **Fast scroller** who flies past a drawing before it finishes: loops must not start for a drawing that is off-screen, and coming back shows it finished (not restarted). Test in Task 2.
2. **Touch device** (no fine pointer): no parallax listeners/offsets; nothing stuck shifted. Test in Task 2.
3. **Low-power / reduced-motion user**: zero running animations on any page. Test in Task 11 (all pages).
4. **Slow network on a project page**: the header drawing and first slide are visible at first paint (never hidden behind a reveal). Tests in Tasks 9–10.
5. **Back button after a morph**: the home page is not left with half-drawn or hidden elements. Test in Task 9.

---

### Task 1: Motion tokens and visual base

**Files:** Modify `src/app.css`; Test `tests/unit/css.test.ts` (create), `tests/e2e/layout.spec.ts`.

- [ ] **Step 1: Failing tests.** Create `tests/unit/css.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/app.css', 'utf8');

describe('motion tokens', () => {
	it('defines the easing and duration tokens once', () => {
		for (const t of ['--ease-out:', '--ease-in-out:', '--ease-draw:', '--ease-pop:', '--dur-xs:', '--dur-s:', '--dur-m:', '--dur-l:', '--color-construct:']) {
			expect(css.split(t).length - 1, t).toBe(1);
		}
	});
	it('uses no raw cubic-bezier outside the token definitions', () => {
		expect(css.match(/cubic-bezier\(/g)!.length).toBe(4);
	});
});
```
Append to `tests/e2e/layout.spec.ts`:
```ts
test('visual base: grain overlay is inert, headings balance, metrics use tabular numerals', async ({ page }) => {
	await page.goto('/');
	const grain = await page.evaluate(() => {
		const s = getComputedStyle(document.body, '::before');
		return { bg: s.backgroundImage, pe: s.pointerEvents, op: Number(s.opacity), pos: s.position };
	});
	expect(grain.bg).toContain('feTurbulence');
	expect(grain.pe).toBe('none');
	expect(grain.op).toBeLessThanOrEqual(0.05);
	expect(grain.pos).toBe('fixed');
	expect(await page.locator('h1').evaluate((h) => getComputedStyle(h).textWrapStyle)).toBe('balance');
	expect(await page.locator('#myne .metric').evaluate((m) => getComputedStyle(m).fontVariantNumeric)).toContain('tabular-nums');
});
```
- [ ] **Step 2: Run** `bunx vitest run tests/unit/css.test.ts; bunx playwright test tests/e2e/layout.spec.ts -g "visual base"` — Expected: FAIL.

- [ ] **Step 3: Implement.** In `src/app.css`, after the `@theme { … }` block add:
```css
:root {
	--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
	--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
	--ease-draw: cubic-bezier(0.55, 0, 0.25, 1);
	--ease-pop: cubic-bezier(0.34, 1.56, 0.64, 1);
	--dur-xs: 140ms;
	--dur-s: 220ms;
	--dur-m: 420ms;
	--dur-l: 900ms;
	--color-construct: rgb(150 190 255 / 0.32);
}
```
Move the grid from `body` to `html` (so a negative-z vignette can sit between canvas and content): cut the `background-image` and `background-size` declarations out of `body` into `html`, and set `body { background: transparent; }` (keep `background-color` on `html`). Then add:
```css
/* film grain above everything (inert), vignette behind content */
body::before {
	content: '';
	position: fixed;
	inset: 0;
	z-index: 60;
	pointer-events: none;
	opacity: 0.045;
	background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}
body::after {
	content: '';
	position: fixed;
	inset: 0;
	z-index: -1;
	pointer-events: none;
	background: radial-gradient(130% 95% at 50% 0%, transparent 55%, rgb(3 10 22 / 0.55) 100%);
}
h1, h2, h3 { text-wrap: balance; }
p { text-wrap: pretty; }
.metric, [data-counter] { font-variant-numeric: tabular-nums; }
```
Replace every raw easing: `cubic-bezier(0.6, 0, 0.2, 1)` → `var(--ease-draw)`; `cubic-bezier(0.2, 0.7, 0.2, 1)` (carousel `.slide`, view-transition group) → `var(--ease-out)`. Add class `metric` to the metric `<p>` in `ProjectSheet.svelte` and in `src/routes/work/[slug]/+page.svelte`.
- [ ] **Step 4: Run** `bun run test` — Expected: PASS. View home at 1440 and 390 in Chrome; the grain must read as texture, not dirt (if visible as noise at arm's length, lower opacity to 0.035).
- [ ] **Step 5: Leak check, commit** `feat: motion tokens, grain, vignette and type refinements`.

---

### Task 2: Drawing engine

**Files:** Modify `src/lib/client/enhance.js`, `src/app.css` (replace the "Self-drawing illustrations" block and its two media blocks), `src/lib/components/DrawOnView.svelte`; Create `tests/e2e/drawings.spec.ts`.

**Interfaces — Produces (CSS/HTML contract every drawing in Tasks 3–6 uses):**
- `<g class="layer" style="--depth: N">` — depth layers (construction −2, structure 0, annotation 2.5, live 3.5).
- `.c` construction guide (dashed, fades in); `.stroke` drawn line (needs `pathLength="1"`; modifiers `.dim`, `.sig`, `.ink`); `.after` appears at its sequence time (not with `.stroke`); `text.type` types on; `text[data-count][data-prefix][data-suffix]` counts up.
- Signature wrappers: `.stamp`, `.cursor`, `.unlock` (rotates about 140,155), `.slide-out`, `.grow` (scale from 0, e.g. mask circles).
- Live-only elements `.live` (opacity 0 unless `[data-live]`) and loops `.ripple`, `.pulse` (needs `pathLength="1"`), `.sweep`, `.wobble`, `.bob`, `.march`, `.foil-shine`, `.vp` + `.vp-a/.vp-b/.vp-c`, `.knob`.
- Fills: `.hatch` (use with `.after`), `.tapdot`, `.capsule-fill`, `.dimtext`, `.sigtext`.
- Figure attributes: `data-drawn` (complete), `data-live` (looping), CSS vars `--t`, `--d`, `--ci`, `--px`, `--py`.
- `<DrawOnView label drawn?: boolean>` — `drawn` server-renders `data-drawn` (project pages).

- [ ] **Step 1: Failing tests** `tests/e2e/drawings.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('stroke timing follows real path length and plays in document order', async ({ page }) => {
	await page.goto('/');
	const fig = page.locator('#myne figure.drawing');
	await fig.scrollIntoViewIfNeeded();
	await expect(fig).toHaveAttribute('data-drawn', '');
	const timing = await fig.evaluate((f) =>
		[...f.querySelectorAll('.stroke')].map((el) => ({
			len: (el as SVGGeometryElement).getTotalLength(),
			d: parseFloat((el as HTMLElement).style.getPropertyValue('--d')),
			t: parseFloat((el as HTMLElement).style.getPropertyValue('--t'))
		}))
	);
	const byLen = [...timing].sort((a, b) => a.len - b.len);
	expect(byLen.at(-1)!.d).toBeGreaterThan(byLen[0].d);
	for (let i = 1; i < timing.length; i++) expect(timing[i].t).toBeGreaterThanOrEqual(timing[i - 1].t);
});

test('loops run only while a finished drawing is on screen, and a revisit is not restarted', async ({ page }) => {
	await page.goto('/');
	const fig = page.locator('#chauffeur figure.drawing');
	await fig.scrollIntoViewIfNeeded();
	await expect(fig).toHaveAttribute('data-live', '', { timeout: 15000 });
	await page.locator('#hard-pills').scrollIntoViewIfNeeded();
	await expect(fig).not.toHaveAttribute('data-live', '');
	expect(await fig.locator('.live').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
	await fig.scrollIntoViewIfNeeded();
	await expect(fig).toHaveAttribute('data-live', '');
	expect(await fig.locator('.stroke').first().evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset))).toBe(0);
});

test('a drawing scrolled past before it finishes never goes live off-screen', async ({ page }) => {
	await page.goto('/');
	const fig = page.locator('#myne figure.drawing');
	await fig.scrollIntoViewIfNeeded();
	await page.waitForTimeout(150);
	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	await page.waitForTimeout(6000);
	await expect(fig).not.toHaveAttribute('data-live', '');
});

test('fine pointer shifts depth layers; touch gets none', async ({ page, browser }) => {
	await page.goto('/');
	const fig = page.locator('#myne figure.drawing');
	await fig.scrollIntoViewIfNeeded();
	const box = (await fig.boundingBox())!;
	await page.mouse.move(box.x + box.width * 0.95, box.y + box.height * 0.95);
	const top = fig.locator('svg > g.layer').last();
	await expect.poll(() => top.evaluate((g) => getComputedStyle(g).transform)).not.toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
	const touch = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
	const p2 = await touch.newPage();
	await p2.goto('/');
	const f2 = p2.locator('#myne figure.drawing');
	await f2.scrollIntoViewIfNeeded();
	expect(await f2.evaluate((f) => (f as HTMLElement).style.getPropertyValue('--px'))).toBe('');
	await touch.close();
});

test('project page drawing is complete at first paint', async ({ page }) => {
	await page.goto('/work/myne');
	await expect(page.locator('header figure.drawing')).toHaveAttribute('data-drawn', '');
	expect(await page.locator('header figure.drawing .stroke').first().evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset))).toBe(0);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });
	test('construction, stamps and grown masks are all visible', async ({ page }) => {
		await page.goto('/');
		for (const sel of ['.c', '.after']) {
			expect(await page.locator(`#chauffeur ${sel}`).first().evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
		}
	});
});
```
- [ ] **Step 2: Run** `bunx playwright test tests/e2e/drawings.spec.ts` — Expected: FAIL (no `--d`, no `data-live`, no layers).

- [ ] **Step 3: DrawOnView** — replace `src/lib/components/DrawOnView.svelte`:
```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	// The drawing engine lives in src/lib/client/enhance.js (no Svelte runtime on these pages).
	// `drawn` renders the finished state server-side (project pages are morph targets).
	let { label, children, class: klass = '', drawn = false }: { label: string; children: Snippet; class?: string; drawn?: boolean } = $props();
</script>

<figure class="drawing {klass}" data-draw data-drawn={drawn ? '' : undefined} role="img" aria-label={label}>
	{@render children()}
</figure>
```
In `src/routes/work/[slug]/+page.svelte` change `<DrawOnView label={p.drawingLabel}>` to `<DrawOnView label={p.drawingLabel} drawn>`.

- [ ] **Step 4: CSS** — in `src/app.css` replace everything from `/* ---------- Self-drawing illustrations ---------- */` up to (not including) `/* ---------- Carousel ---------- */` with:
```css
/* ---------- Self-drawing illustrations ---------- */
.drawing { margin: 0; color: var(--color-paper); }
.drawing svg { display: block; width: 100%; height: auto; overflow: visible; }
.drawing .stroke { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.drawing .ink { stroke-width: 2.4; }
.drawing .dim { stroke: var(--color-line-dim); }
.drawing .sig { stroke: var(--color-signal); }
.drawing .c { fill: none; stroke: var(--color-construct); stroke-width: 0.75; stroke-dasharray: 2 4; }
.drawing text { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.08em; fill: currentColor; }
.drawing .dimtext { fill: rgb(242 234 216 / 0.62); font-size: 8.5px; letter-spacing: 0.14em; }
.drawing text.sig, .drawing .sigtext { fill: var(--color-signal); stroke: none; }
.drawing .tapdot { fill: var(--color-signal); }
.drawing .capsule-fill { fill: var(--color-signal); fill-opacity: 0.85; stroke: none; }
.drawing .knob { fill: var(--color-ink); stroke: var(--color-signal); stroke-width: 1.5; }
.drawing .foil-shine { fill: rgb(255 255 255 / 0.55); stroke: none; }
.drawing .ripple { fill: none; stroke: var(--color-signal); stroke-width: 1.2; }
.drawing .pulse { fill: none; stroke: var(--color-signal); stroke-width: 2.4; stroke-linecap: round; stroke-dasharray: 0.08 1.2; stroke-dashoffset: 1.08; filter: drop-shadow(0 0 3px rgb(255 122 61 / 0.9)); }
.drawing .sweep { stroke-width: 1.5; }
.drawing :is(.stamp, .grow, .wobble, .bob, .ripple) { transform-box: fill-box; transform-origin: center; }
.drawing .cursor { transform-box: fill-box; transform-origin: 0 0; }
.drawing .unlock { transform-box: view-box; transform-origin: 140px 155px; }
.drawing .layer {
	transform: translate(calc(var(--px, 0) * var(--depth, 0) * 1.6px), calc(var(--py, 0) * var(--depth, 0) * 1.6px));
	transition: transform 600ms var(--ease-out);
}
.drawing .live, .drawing .vp-b, .drawing .vp-c { opacity: 0; }
[data-draw][data-live] .live { opacity: 1; }

/* hidden-until-drawn states — JS only; the inline fallback drops html.js if enhance.js never runs */
html.js [data-draw]:not([data-drawn]) .c { opacity: 0; }
html.js [data-draw] .c { transition: opacity var(--dur-m) var(--ease-out) var(--t, 0ms); }
html.js [data-draw] .stroke { stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset var(--d, 900ms) var(--ease-draw) var(--t, 0ms); }
html.js [data-draw][data-drawn] .stroke { stroke-dashoffset: 0; }
html.js [data-draw]:not([data-drawn]) .after:not(.stroke) { opacity: 0; }
html.js [data-draw] .after:not(.stroke) { transition: opacity var(--dur-m) var(--ease-out) var(--t, 0ms); }
html.js [data-draw]:not([data-drawn]) .type tspan { opacity: 0; }
html.js [data-draw] .type tspan { transition: opacity 80ms linear calc(var(--t, 0ms) + var(--ci, 0) * 32ms); }
html.js [data-draw]:not([data-drawn]) .stamp { opacity: 0; transform: scale(1.5) rotate(-10deg); }
html.js [data-draw] .stamp { transform: rotate(-3deg); transition: opacity 120ms linear var(--t, 0ms), transform var(--dur-m) var(--ease-pop) var(--t, 0ms); }
html.js [data-draw]:not([data-drawn]) .cursor { opacity: 0; transform: translate(36px, 30px); }
html.js [data-draw] .cursor { transition: opacity var(--dur-s) linear var(--t, 0ms), transform var(--dur-l) var(--ease-out) var(--t, 0ms); }
html.js [data-draw]:not([data-drawn]) .unlock { transform: rotate(-120deg); }
html.js [data-draw] .unlock { transition: transform 1400ms var(--ease-pop) var(--t, 0ms); }
html.js [data-draw]:not([data-drawn]) .slide-out { transform: translateX(-40px); }
html.js [data-draw] .slide-out { transition: transform 1200ms var(--ease-out) var(--t, 0ms); }
html.js [data-draw]:not([data-drawn]) .grow { transform: scale(0); }
html.js [data-draw] .grow { transition: transform 1100ms var(--ease-out) var(--t, 0ms); }

/* alive — only while on screen (data-live), never under reduced motion */
[data-draw][data-live] .ripple { animation: d-ripple 2.6s var(--ease-out) infinite; }
[data-draw][data-live] .pulse { animation: d-pulse 3.2s var(--ease-in-out) infinite; }
[data-draw][data-live] .sweep { animation: d-sweep 3.6s var(--ease-in-out) infinite alternate; }
[data-draw][data-live] .cursor { animation: d-press 2.6s var(--ease-out) infinite; }
[data-draw][data-live] .wobble { animation: d-wobble 3.4s var(--ease-in-out) infinite alternate; }
[data-draw][data-live] .bob { animation: d-bob 2.4s var(--ease-in-out) infinite alternate; }
[data-draw][data-live] .march { stroke-dasharray: 6 10; animation: d-march 1.1s linear infinite; }
[data-draw][data-live] .foil-shine { animation: d-shine 2.8s var(--ease-in-out) infinite; }
[data-draw][data-live] .vp { animation: d-vp 4.8s var(--ease-in-out) infinite; }
[data-draw][data-live] .vp-b { animation-delay: -3.2s; }
[data-draw][data-live] .vp-c { animation-delay: -1.6s; }
[data-draw][data-live] .knob { animation: d-knob 4.8s var(--ease-in-out) infinite; }
@keyframes d-ripple { from { transform: scale(0.4); opacity: 0.9; } to { transform: scale(2.6); opacity: 0; } }
@keyframes d-pulse { 0% { stroke-dashoffset: 1.08; opacity: 0; } 12% { opacity: 1; } 70% { stroke-dashoffset: 0; opacity: 1; } 82%, 100% { stroke-dashoffset: 0; opacity: 0; } }
@keyframes d-sweep { from { transform: translateY(56px); } to { transform: translateY(240px); } }
@keyframes d-press { 0%, 100% { transform: none; } 5% { transform: scale(0.86); } 12% { transform: none; } }
@keyframes d-wobble { from { transform: rotate(-4deg); } to { transform: rotate(4deg); } }
@keyframes d-bob { from { transform: translateY(-2px); } to { transform: translateY(2px); } }
@keyframes d-march { to { stroke-dashoffset: -16; } }
@keyframes d-shine { 0%, 100% { opacity: 0; } 45% { opacity: 0.6; } 55% { opacity: 0; } }
@keyframes d-vp { 0%, 28% { opacity: 1; } 33%, 95% { opacity: 0; } 100% { opacity: 1; } }
@keyframes d-knob { 0%, 28% { transform: translateX(-22px); } 33%, 61% { transform: translateX(0); } 66%, 94% { transform: translateX(22px); } 100% { transform: translateX(-22px); } }

@media (prefers-reduced-motion: reduce), print {
	html.js [data-draw] :is(.c, .stroke, .after, .type tspan, .stamp, .cursor, .unlock, .slide-out, .grow) {
		transition: none !important;
		opacity: 1;
		stroke-dashoffset: 0;
		transform: none;
	}
	.drawing .layer { transition: none; transform: none; }
}
```
(The token test from Task 1 still holds: no new raw `cubic-bezier`.)

- [ ] **Step 5: Engine** — replace the drawing half of `src/lib/client/enhance.js` (everything above the `document.querySelectorAll('[data-copy-root]')` block) with:
```js
(() => {
	document.documentElement.classList.add('draw-ready');
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const fine = matchMedia('(pointer: fine)').matches;
	const OVERLAP = 0.35; // the next stroke starts when the previous one is 35% drawn
	const START = 260; // construction prelude before the first stroke
	const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
	const SVG = 'http://www.w3.org/2000/svg';

	// Labels type on letter by letter.
	const splitType = (fig) =>
		fig.querySelectorAll('text.type').forEach((t) => {
			const s = t.textContent;
			t.textContent = '';
			[...s].forEach((ch, i) => {
				const span = document.createElementNS(SVG, 'tspan');
				span.textContent = ch;
				span.style.setProperty('--ci', String(i));
				t.appendChild(span);
			});
		});

	// Start time (--t) for every part; duration (--d) for strokes from their real length.
	const choreograph = (fig) => {
		fig.querySelectorAll('.c').forEach((el, i) => el.style.setProperty('--t', `${i * 40}ms`));
		let t = START;
		let end = START;
		for (const el of fig.querySelectorAll('.stroke, .after, .type, .stamp, .cursor, .unlock, .slide-out, .grow, [data-count]')) {
			el.style.setProperty('--t', `${Math.round(t)}ms`);
			if (el.classList.contains('stroke') && 'getTotalLength' in el) {
				const d = clamp(el.getTotalLength() * 2.4, 280, 1400);
				el.style.setProperty('--d', `${Math.round(d)}ms`);
				end = Math.max(end, t + d);
				t += d * OVERLAP;
			} else {
				end = Math.max(end, t + 700);
				t += 90;
			}
		}
		return end;
	};

	// Dimension values count up when they appear.
	const countUp = (el) => {
		const to = Number(el.dataset.count);
		const pre = el.dataset.prefix ?? '';
		const post = el.dataset.suffix ?? '';
		const delay = parseFloat(el.style.getPropertyValue('--t')) || 0;
		setTimeout(() => {
			const t0 = performance.now();
			const tick = (now) => {
				const p = Math.min(1, (now - t0) / 700);
				el.textContent = pre + Math.round(to * (1 - (1 - p) ** 3)) + post;
				if (p < 1) requestAnimationFrame(tick);
			};
			el.textContent = pre + '0' + post;
			requestAnimationFrame(tick);
		}, delay);
	};

	const figs = [...document.querySelectorAll('[data-draw]')];
	const state = new Map();
	const setLive = (fig) => {
		const s = state.get(fig);
		fig.toggleAttribute('data-live', !reduce && s.done && s.visible);
	};
	const draw = (fig) => {
		const s = state.get(fig);
		if (fig.hasAttribute('data-drawn') || reduce) {
			fig.setAttribute('data-drawn', '');
			s.done = true;
			return setLive(fig);
		}
		splitType(fig);
		const end = choreograph(fig);
		fig.querySelectorAll('[data-count]').forEach(countUp);
		requestAnimationFrame(() => requestAnimationFrame(() => fig.setAttribute('data-drawn', '')));
		setTimeout(() => {
			s.done = true;
			setLive(fig);
		}, end + 200);
	};

	figs.forEach((f) => state.set(f, { done: false, visible: false, started: false }));
	if (!('IntersectionObserver' in window)) {
		figs.forEach((f) => {
			state.get(f).visible = true;
			draw(f);
		});
	} else {
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					const s = state.get(e.target);
					s.visible = e.intersectionRatio > 0;
					if (e.intersectionRatio >= 0.35 && !s.started) {
						s.started = true;
						draw(e.target);
					}
					setLive(e.target);
				}
			},
			{ threshold: [0, 0.35] }
		);
		figs.forEach((f) => io.observe(f));
	}

	// Depth parallax for fine pointers only.
	if (fine && !reduce) {
		figs.forEach((fig) => {
			let raf = 0;
			fig.addEventListener('pointermove', (e) => {
				const r = fig.getBoundingClientRect();
				const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
				const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
				cancelAnimationFrame(raf);
				raf = requestAnimationFrame(() => {
					fig.style.setProperty('--px', x.toFixed(3));
					fig.style.setProperty('--py', y.toFixed(3));
				});
			});
			fig.addEventListener('pointerleave', () => {
				fig.style.setProperty('--px', '0');
				fig.style.setProperty('--py', '0');
			});
		});
	}
```
(keep the existing copy-button block and the closing `})();` below it).

- [ ] **Step 6: Run** `bunx playwright test tests/e2e/drawings.spec.ts tests/e2e/work.spec.ts` — Expected: the timing, revisit, fast-scroll, project-page and no-JS tests PASS with the *current* drawings (they already have `.stroke`/`.after`); the loop and parallax tests still FAIL until Tasks 3–6 add `.live` elements and `g.layer` groups — expected. All `work.spec.ts` tests PASS.
- [ ] **Step 7: Budget.** `bun run build && gzip -c build/_app/immutable/assets/enhance*.js | wc -c` → < 3584. Leak check, commit `feat: drawing engine — length-timed strokes, sequencing, typing, count-up, live loops, depth`.

---

### Task 3: chauffeur drawing — "the tap that did nothing"

**Files:** Replace `src/lib/drawings/PhoneNoEffect.svelte`; Test `tests/e2e/drawings.spec.ts` (append).

- [ ] **Step 1: Failing test** (shared by Tasks 3–6; append once here):
```ts
const slugs = ['chauffeur', 'myne', 'mri-viewer', 'hard-pills'];
for (const slug of slugs) {
	test(`${slug} drawing is layered and intricate`, async ({ page }) => {
		await page.goto('/');
		const fig = page.locator(`#${slug} figure.drawing`);
		expect(await fig.locator('svg > g.layer').count()).toBeGreaterThanOrEqual(4);
		expect(await fig.locator('.stroke, .after, .c, .type').count()).toBeGreaterThanOrEqual(30);
		expect(await fig.locator('.live, .wobble, .bob, .march, .vp, .knob').count()).toBeGreaterThanOrEqual(1);
	});
}

test('chauffeur dimension counts up to its final value', async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => {
		(window as any).__seen = [];
		const t = document.querySelector('#chauffeur text[data-count="260"]')!;
		new MutationObserver(() => (window as any).__seen.push(t.textContent)).observe(t, { childList: true, characterData: true, subtree: true });
	});
	await page.locator('#chauffeur').scrollIntoViewIfNeeded();
	await expect(page.locator('#chauffeur text[data-count="260"]')).toHaveText('H 260', { timeout: 10000 });
	const seen: string[] = await page.evaluate(() => (window as any).__seen);
	expect(seen.some((s) => s !== 'H 260')).toBe(true);
});
```
- [ ] **Step 2: Run** `bunx playwright test tests/e2e/drawings.spec.ts -g "chauffeur"` — Expected: FAIL.
- [ ] **Step 3: Drawing** — replace `src/lib/drawings/PhoneNoEffect.svelte`:
```svelte
<svg viewBox="0 0 400 300" aria-hidden="true">
	<g class="layer" style="--depth: -2">
		<line class="c" x1="200" y1="8" x2="200" y2="292" />
		<line class="c" x1="104" y1="184" x2="392" y2="184" />
		<rect class="c" x="124" y="14" width="152" height="272" />
		<circle class="c" cx="200" cy="184" r="28" />
	</g>
	<g class="layer" style="--depth: 0">
		<rect class="stroke" pathLength="1" x="130" y="20" width="140" height="260" rx="24" />
		<rect class="stroke dim" pathLength="1" x="138" y="28" width="124" height="244" rx="17" />
		<rect class="stroke" pathLength="1" x="181" y="36" width="38" height="10" rx="5" />
		<line class="stroke" pathLength="1" x1="128" y1="72" x2="128" y2="88" />
		<line class="stroke" pathLength="1" x1="128" y1="98" x2="128" y2="122" />
		<line class="stroke" pathLength="1" x1="272" y1="94" x2="272" y2="128" />
		<line class="stroke" pathLength="1" x1="148" y1="41" x2="160" y2="41" />
		<line class="stroke dim" pathLength="1" x1="236" y1="43" x2="236" y2="40" />
		<line class="stroke dim" pathLength="1" x1="240" y1="43" x2="240" y2="38" />
		<line class="stroke dim" pathLength="1" x1="244" y1="43" x2="244" y2="36" />
		<rect class="stroke dim" pathLength="1" x="248" y="37" width="10" height="6" rx="1.5" />
		<line class="stroke" pathLength="1" x1="150" y1="62" x2="212" y2="62" />
		<line class="stroke dim" pathLength="1" x1="150" y1="71" x2="188" y2="71" />
		<rect class="stroke" pathLength="1" x="150" y="88" width="100" height="22" rx="4" />
		<line class="stroke dim" pathLength="1" x1="158" y1="99" x2="196" y2="99" />
		<rect class="stroke" pathLength="1" x="150" y="118" width="100" height="22" rx="4" />
		<line class="stroke dim" pathLength="1" x1="158" y1="129" x2="210" y2="129" />
		<rect class="stroke dim" pathLength="1" x="150" y="149" width="8" height="8" rx="1.5" />
		<line class="stroke dim" pathLength="1" x1="164" y1="153" x2="216" y2="153" />
		<rect class="stroke dim" pathLength="1" x="150" y="170" width="100" height="28" rx="7" />
		<line class="stroke dim" pathLength="1" x1="182" y1="184" x2="218" y2="184" />
		<line class="stroke" pathLength="1" x1="180" y1="264" x2="220" y2="264" />
	</g>
	<g class="layer" style="--depth: 2.5">
		<line class="stroke dim" pathLength="1" x1="112" y1="20" x2="112" y2="280" />
		<path class="stroke dim" pathLength="1" d="M108 28 L112 20 L116 28" />
		<path class="stroke dim" pathLength="1" d="M108 272 L112 280 L116 272" />
		<text class="after" x="64" y="154" data-count="260" data-prefix="H ">H 260</text>
		<line class="stroke dim" pathLength="1" x1="130" y1="292" x2="270" y2="292" />
		<path class="stroke dim" pathLength="1" d="M138 288 L130 292 L138 296" />
		<path class="stroke dim" pathLength="1" d="M262 288 L270 292 L262 296" />
		<text class="after" x="282" y="296" data-count="140" data-prefix="W ">W 140</text>
		<g class="cursor">
			<path class="stroke" pathLength="1" d="M204 190 L204 210 L209 205 L213 214 L217 212 L213 203 L220 203 Z" />
		</g>
		<circle class="tapdot after" cx="200" cy="184" r="3.5" />
		<circle class="stroke sig" pathLength="1" cx="200" cy="184" r="9" />
		<circle class="stroke sig" pathLength="1" cx="200" cy="184" r="18" />
		<polyline class="stroke sig" pathLength="1" points="214,177 276,117 298,117" />
		<g class="stamp">
			<rect class="stroke sig" pathLength="1" x="298" y="104" width="90" height="26" rx="2" />
			<text class="sig type" x="306" y="121">NO EFFECT</text>
		</g>
		<text class="dimtext type" x="300" y="146">0 CHANGES</text>
	</g>
	<g class="layer" style="--depth: 3.5">
		<circle class="ripple live" cx="200" cy="184" r="10" />
		<circle class="ripple live" cx="200" cy="184" r="10" style="animation-delay: -1.3s" />
		<path class="pulse live" pathLength="1" d="M214 177 L276 117 L298 117" />
	</g>
</svg>
```
- [ ] **Step 4: Run** `bunx playwright test tests/e2e/drawings.spec.ts tests/e2e/work.spec.ts` — Expected: chauffeur tests PASS; the "loops" and "parallax" tests from Task 2 now PASS too (they use chauffeur/myne — myne parallax passes once Task 4 lands; if run now, only that one still fails).
- [ ] **Step 5: Look at it.** `bun scripts/filmstrip.ts chauffeur` (created in Task 11 Step 1 — if executing in order, create it now from Task 11 and reuse) and view the strip; the stamp must land after the ripples, labels must not overlap the frame. Adjust coordinates if they do.
- [ ] **Step 6: Leak check, commit** `feat: intricate chauffeur drawing`.

---

### Task 4: Myne drawing — "the vault unlocks, the passport slides out"

**Files:** Replace `src/lib/drawings/PassportVault.svelte`.

- [ ] **Step 1:** Run `bunx playwright test tests/e2e/drawings.spec.ts -g "myne"` — Expected: FAIL (layer/intricacy).
- [ ] **Step 2: Drawing** — replace `src/lib/drawings/PassportVault.svelte`:
```svelte
<svg viewBox="0 0 400 300" aria-hidden="true">
	<defs>
		<pattern id="hatch-myne" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
			<line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" stroke-width="1" opacity="0.45" />
		</pattern>
	</defs>
	<g class="layer" style="--depth: -2">
		<line class="c" x1="30" y1="155" x2="250" y2="155" />
		<line class="c" x1="140" y1="45" x2="140" y2="265" />
		<circle class="c" cx="140" cy="155" r="104" />
		<rect class="c" x="242" y="79" width="124" height="162" />
	</g>
	<g class="layer" style="--depth: 0">
		<rect class="stroke" pathLength="1" x="30" y="122" width="12" height="66" rx="2" />
		<line class="stroke dim" pathLength="1" x1="30" y1="140" x2="42" y2="140" />
		<line class="stroke dim" pathLength="1" x1="30" y1="170" x2="42" y2="170" />
		<circle class="stroke" pathLength="1" cx="140" cy="155" r="95" />
		<circle class="stroke" pathLength="1" cx="140" cy="155" r="78" />
		<path class="hatch after" d="M140 60 a95 95 0 1 0 0.01 0 Z M140 77 a78 78 0 1 0 0.01 0 Z" fill="url(#hatch-myne)" fill-rule="evenodd" />
		<circle class="stroke dim" pathLength="1" cx="227" cy="155" r="3" />
		<circle class="stroke dim" pathLength="1" cx="201.5" cy="216.5" r="3" />
		<circle class="stroke dim" pathLength="1" cx="140" cy="242" r="3" />
		<circle class="stroke dim" pathLength="1" cx="78.5" cy="216.5" r="3" />
		<circle class="stroke dim" pathLength="1" cx="53" cy="155" r="3" />
		<circle class="stroke dim" pathLength="1" cx="78.5" cy="93.5" r="3" />
		<circle class="stroke dim" pathLength="1" cx="140" cy="68" r="3" />
		<circle class="stroke dim" pathLength="1" cx="201.5" cy="93.5" r="3" />
		<circle class="stroke" pathLength="1" cx="140" cy="155" r="26" />
		<circle class="stroke dim" pathLength="1" cx="140" cy="155" r="16" />
		<line class="stroke dim" pathLength="1" x1="159" y1="155" x2="163" y2="155" />
		<line class="stroke dim" pathLength="1" x1="156.45" y1="164.5" x2="159.92" y2="166.5" />
		<line class="stroke dim" pathLength="1" x1="149.5" y1="171.45" x2="151.5" y2="174.92" />
		<line class="stroke dim" pathLength="1" x1="140" y1="174" x2="140" y2="178" />
		<line class="stroke dim" pathLength="1" x1="130.5" y1="171.45" x2="128.5" y2="174.92" />
		<line class="stroke dim" pathLength="1" x1="123.55" y1="164.5" x2="120.08" y2="166.5" />
		<line class="stroke dim" pathLength="1" x1="121" y1="155" x2="117" y2="155" />
		<line class="stroke dim" pathLength="1" x1="123.55" y1="145.5" x2="120.08" y2="143.5" />
		<line class="stroke dim" pathLength="1" x1="130.5" y1="138.55" x2="128.5" y2="135.08" />
		<line class="stroke dim" pathLength="1" x1="140" y1="136" x2="140" y2="132" />
		<line class="stroke dim" pathLength="1" x1="149.5" y1="138.55" x2="151.5" y2="135.08" />
		<line class="stroke dim" pathLength="1" x1="156.45" y1="145.5" x2="159.92" y2="143.5" />
		<g class="unlock">
			<line class="stroke" pathLength="1" x1="140" y1="129" x2="140" y2="95" />
			<circle class="stroke" pathLength="1" cx="140" cy="90" r="5" />
			<line class="stroke" pathLength="1" x1="162.52" y1="168" x2="191.96" y2="185" />
			<circle class="stroke" pathLength="1" cx="196.29" cy="187.5" r="5" />
			<line class="stroke" pathLength="1" x1="117.48" y1="168" x2="88.04" y2="185" />
			<circle class="stroke" pathLength="1" cx="83.71" cy="187.5" r="5" />
		</g>
		<g class="slide-out">
			<rect class="stroke" pathLength="1" x="248" y="85" width="112" height="150" rx="8" />
			<line class="stroke dim" pathLength="1" x1="256" y1="85" x2="256" y2="235" />
			<rect class="stroke sig" pathLength="1" x="330" y="94" width="20" height="14" rx="2" />
			<circle class="stroke" pathLength="1" cx="304" cy="138" r="22" />
			<circle class="stroke dim" pathLength="1" cx="304" cy="138" r="16" />
			<path class="stroke sig" pathLength="1" d="M294 138 l7 7 l14 -14" />
			<line class="stroke" pathLength="1" x1="268" y1="186" x2="340" y2="186" />
			<line class="stroke dim" pathLength="1" x1="268" y1="198" x2="326" y2="198" />
			<line class="stroke dim" pathLength="1" x1="268" y1="210" x2="334" y2="210" />
			<line class="stroke dim" pathLength="1" x1="266" y1="224" x2="344" y2="224" />
		</g>
	</g>
	<g class="layer" style="--depth: 2.5">
		<line class="stroke dim" pathLength="1" x1="202" y1="160" x2="238" y2="160" />
		<path class="stroke dim" pathLength="1" d="M231 154 L238 160 L231 166" />
		<line class="stroke dim" pathLength="1" x1="140" y1="155" x2="72.8" y2="222.2" />
		<text class="after" x="34" y="262" data-count="190" data-prefix="Ø ">Ø 190</text>
		<polyline class="stroke sig" pathLength="1" points="320,85 340,52 386,52" />
		<text class="type" x="322" y="46">PASSPORT</text>
		<text class="dimtext type" x="322" y="66">OWNER-HELD KEY</text>
		<polyline class="stroke sig" pathLength="1" points="92,72 72,34 18,34" />
		<text class="type" x="18" y="27">VAULT</text>
		<text class="dimtext type" x="18" y="48">16,830 RECORDS</text>
	</g>
	<g class="layer" style="--depth: 3.5">
		<path class="pulse live" pathLength="1" d="M140 155 C 190 118, 252 108, 304 138" />
		<rect class="foil-shine live" x="330" y="94" width="20" height="14" rx="2" />
	</g>
</svg>
```
- [ ] **Step 3: Run** `bunx playwright test tests/e2e/drawings.spec.ts` — Expected: myne + parallax tests PASS.
- [ ] **Step 4: Look at it** with the filmstrip (Task 11 script); the dial must finish its unlock after its spokes draw; the passport must land before the pulse starts.
- [ ] **Step 5: Leak check, commit** `feat: intricate Myne drawing`.

---

### Task 5: MRI drawing — "slices stack, the viewer wires in"

**Files:** Replace `src/lib/drawings/ScanSlices.svelte`.

- [ ] **Step 1:** Run `bunx playwright test tests/e2e/drawings.spec.ts -g "mri-viewer"` — Expected: FAIL.
- [ ] **Step 2: Drawing** — replace `src/lib/drawings/ScanSlices.svelte`:
```svelte
<svg viewBox="0 0 400 300" aria-hidden="true">
	<defs>
		<linearGradient id="sweep-grad" x1="0" x2="1" y1="0" y2="0">
			<stop offset="0" style="stop-color: var(--color-signal); stop-opacity: 0" />
			<stop offset="0.5" style="stop-color: var(--color-signal); stop-opacity: 0.9" />
			<stop offset="1" style="stop-color: var(--color-signal); stop-opacity: 0" />
		</linearGradient>
	</defs>
	<g class="layer" style="--depth: -2">
		<line class="c" x1="130" y1="36" x2="130" y2="262" />
		<line class="c" x1="24" y1="248" x2="236" y2="248" />
		<rect class="c" x="264" y="34" width="108" height="222" />
		<line class="c" x1="222" y1="190" x2="282" y2="110" />
	</g>
	<g class="layer" style="--depth: 0">
		<path class="stroke dim" pathLength="1" d="M40 56 L170 36 L220 81 L90 101 Z" />
		<path class="stroke dim" pathLength="1" d="M40 90 L170 70 L220 115 L90 135 Z" />
		<path class="stroke dim" pathLength="1" d="M40 124 L170 104 L220 149 L90 169 Z" />
		<path class="stroke dim" pathLength="1" d="M40 158 L170 138 L220 183 L90 203 Z" />
		<path class="stroke" pathLength="1" d="M40 192 L170 172 L220 217 L90 237 Z" />
		<line class="stroke dim" pathLength="1" x1="40" y1="56" x2="40" y2="192" />
		<line class="stroke dim" pathLength="1" x1="170" y1="36" x2="170" y2="172" />
		<line class="stroke dim" pathLength="1" x1="220" y1="81" x2="220" y2="217" />
		<line class="stroke dim" pathLength="1" x1="90" y1="101" x2="90" y2="237" />
		<path class="stroke" pathLength="1" d="M98 206 C 104 190 152 182 170 194 C 186 205 176 222 148 226 C 120 230 92 220 98 206 Z" />
		<path class="stroke dim" pathLength="1" d="M106 206 C 112 194 150 188 164 197 C 176 205 168 218 146 221 C 124 224 102 216 106 206 Z" />
		<path class="stroke" pathLength="1" d="M124 202 C 130 196 138 196 142 202" />
		<path class="stroke" pathLength="1" d="M128 212 C 134 218 144 218 150 212" />
		<line class="stroke dim" pathLength="1" x1="133" y1="186" x2="137" y2="224" />
		<rect class="stroke" pathLength="1" x="270" y="40" width="96" height="210" rx="16" />
		<rect class="stroke dim" pathLength="1" x="276" y="46" width="84" height="198" rx="11" />
		<rect class="stroke" pathLength="1" x="304" y="52" width="28" height="6" rx="3" />
		<rect class="stroke" pathLength="1" x="282" y="74" width="72" height="72" />
		<g class="vp vp-a">
			<path class="stroke" pathLength="1" d="M296 110 C 296 90 340 86 342 108 C 344 128 322 136 308 132 C 298 129 296 120 296 110 Z" />
			<path class="stroke" pathLength="1" d="M310 104 C 314 100 320 100 322 104" />
			<path class="stroke" pathLength="1" d="M312 116 C 316 120 322 120 326 116" />
		</g>
		<g class="vp vp-b" fill="none" stroke="currentColor" stroke-width="1.5">
			<path d="M292 110 C 292 86 344 82 346 108 C 348 132 322 140 306 136 C 294 132 292 122 292 110 Z" />
			<path d="M308 100 C 314 94 324 94 328 102" />
			<path d="M306 118 C 314 126 326 126 332 116" />
		</g>
		<g class="vp vp-c" fill="none" stroke="currentColor" stroke-width="1.5">
			<path d="M300 110 C 300 94 336 92 338 108 C 340 124 322 130 312 128 C 304 126 300 118 300 110 Z" />
			<line x1="318" y1="96" x2="319" y2="126" />
		</g>
		<line class="stroke dim" pathLength="1" x1="284" y1="170" x2="352" y2="170" />
		<rect class="stroke sig" pathLength="1" x="282" y="182" width="22" height="10" rx="5" />
		<rect class="stroke dim" pathLength="1" x="308" y="182" width="22" height="10" rx="5" />
		<rect class="stroke dim" pathLength="1" x="334" y="182" width="22" height="10" rx="5" />
		<rect class="stroke dim" pathLength="1" x="282" y="202" width="34" height="12" rx="6" />
		<rect class="stroke dim" pathLength="1" x="320" y="202" width="34" height="12" rx="6" />
		<line class="stroke" pathLength="1" x1="302" y1="238" x2="334" y2="238" />
	</g>
	<g class="layer" style="--depth: 2.5">
		<path class="stroke dim" pathLength="1" d="M222 192 C 246 172, 256 120, 282 110" />
		<text class="dimtext type" x="230" y="150">BRIDGE</text>
		<text class="dimtext type" x="24" y="30">AXIAL · T2</text>
		<circle class="knob after" cx="318" cy="170" r="5" />
		<text class="sigtext after" x="272" y="272" data-count="117" data-prefix="SLICE " data-suffix="/232">SLICE 117/232</text>
	</g>
	<g class="layer" style="--depth: 3.5">
		<line class="sweep live" x1="34" y1="0" x2="226" y2="0" stroke="url(#sweep-grad)" />
		<path class="pulse live" pathLength="1" d="M222 192 C 246 172, 256 120, 282 110" />
	</g>
</svg>
```
- [ ] **Step 3: Run** `bunx playwright test tests/e2e/drawings.spec.ts` — Expected: mri tests PASS. Also re-run `tests/e2e/work.spec.ts` (the old SLICE label test, if any, keys on text — the label now reads `SLICE 117/232` at the end).
- [ ] **Step 4: Look at it** (filmstrip): the viewport frames must cycle in step with the knob (frame A while knob is left, B centre, C right).
- [ ] **Step 5: Leak check, commit** `feat: intricate MRI drawing`.

---

### Task 6: Hard Pills drawing — "the page inks in"

**Files:** Replace `src/lib/drawings/ComicPanels.svelte`.

- [ ] **Step 1:** Run `bunx playwright test tests/e2e/drawings.spec.ts -g "hard-pills"` — Expected: FAIL.
- [ ] **Step 2: Drawing** — replace `src/lib/drawings/ComicPanels.svelte`:
```svelte
<svg viewBox="0 0 400 300" aria-hidden="true">
	<defs>
		<pattern id="halftone" width="8" height="8" patternUnits="userSpaceOnUse">
			<circle cx="4" cy="4" r="1.6" fill="currentColor" />
		</pattern>
		<mask id="halftone-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="300">
			<circle class="grow" cx="96" cy="202" r="90" fill="white" />
		</mask>
	</defs>
	<g class="layer" style="--depth: -2">
		<rect class="c" x="32" y="22" width="336" height="256" />
		<line class="c" x1="206" y1="22" x2="206" y2="138" />
		<line class="c" x1="32" y1="138" x2="368" y2="138" />
		<line class="c" x1="148" y1="138" x2="148" y2="278" />
	</g>
	<g class="layer" style="--depth: 0">
		<rect class="stroke ink" pathLength="1" x="40" y="30" width="320" height="240" />
		<rect class="stroke" pathLength="1" x="48" y="38" width="154" height="96" />
		<rect class="stroke" pathLength="1" x="210" y="38" width="142" height="96" />
		<rect class="stroke" pathLength="1" x="48" y="142" width="96" height="120" />
		<rect class="stroke" pathLength="1" x="152" y="142" width="200" height="120" />
		<path class="stroke" pathLength="1" d="M72 50 h96 a10 10 0 0 1 10 10 v26 a10 10 0 0 1 -10 10 h-62 l-16 14 l3 -14 h-21 a10 10 0 0 1 -10 -10 v-26 a10 10 0 0 1 10 -10 Z" />
		<line class="stroke" pathLength="1" x1="76" y1="66" x2="158" y2="66" />
		<line class="stroke dim" pathLength="1" x1="76" y1="78" x2="140" y2="78" />
		<line class="stroke dim" pathLength="1" x1="56" y1="124" x2="118" y2="124" />
		<g class="wobble">
			<path class="stroke sig" pathLength="1" d="M285 48 L295 71 L320 64 L308 86 L330 100 L304 104 L308 128 L288 112 L270 130 L268 106 L244 102 L264 88 L252 66 L276 72 Z" />
		</g>
		<g class="bob">
			<path class="capsule-fill after" d="M293.3 99 L281 107.6 A11 11 0 0 1 268.4 89.6 L280.7 81 Z" />
			<path class="stroke" pathLength="1" d="M281 107.6 L305.6 90.4 A11 11 0 0 0 293 72.4 L268.4 89.6 A11 11 0 0 0 281 107.6 Z" />
			<line class="stroke" pathLength="1" x1="293.3" y1="99" x2="280.7" y2="81" />
		</g>
		<rect x="48" y="142" width="96" height="120" fill="url(#halftone)" fill-opacity="0.5" mask="url(#halftone-reveal)" />
		<line class="stroke dim" pathLength="1" x1="56" y1="250" x2="136" y2="170" />
		<rect class="stroke dim" pathLength="1" x="158" y="148" width="66" height="16" />
		<text class="dimtext type" x="164" y="159">LATER…</text>
		<path class="stroke" pathLength="1" d="M170 236 C 210 176 280 176 340 236" />
		<rect class="after" x="152" y="206" width="200" height="56" fill="url(#halftone)" fill-opacity="0.3" />
		<line class="after march" x1="316" y1="226" x2="186" y2="168" style="stroke: var(--color-line-dim); stroke-width: 1.5" />
		<line class="after march" x1="318" y1="232" x2="178" y2="200" style="stroke: var(--color-line-dim); stroke-width: 1.5" />
		<line class="after march" x1="316" y1="240" x2="182" y2="236" style="stroke: var(--color-line-dim); stroke-width: 1.5" />
		<line class="after march" x1="322" y1="222" x2="232" y2="156" style="stroke: var(--color-line-dim); stroke-width: 1.5" />
		<line class="after march" x1="328" y1="220" x2="282" y2="176" style="stroke: var(--color-line-dim); stroke-width: 1.5" />
	</g>
	<g class="layer" style="--depth: 2.5">
		<line class="stroke dim" pathLength="1" x1="28" y1="24" x2="40" y2="24" />
		<line class="stroke dim" pathLength="1" x1="34" y1="18" x2="34" y2="30" />
		<line class="stroke dim" pathLength="1" x1="360" y1="276" x2="372" y2="276" />
		<line class="stroke dim" pathLength="1" x1="366" y1="270" x2="366" y2="282" />
		<text class="dimtext type" x="44" y="16">ISSUE 01 · POP-ART EDITION</text>
		<text class="dimtext type" x="330" y="292">P. 04</text>
		<g class="stamp">
			<rect class="stroke sig" pathLength="1" x="290" y="150" width="52" height="20" rx="2" />
			<text class="sigtext" x="298" y="165">POW!</text>
		</g>
	</g>
	<g class="layer" style="--depth: 3.5">
		<text class="sigtext live" x="322" y="58">!!</text>
	</g>
</svg>
```
Note: the speed lines are `.after` + `.march`, deliberately **not** `.stroke` — they fade in at their sequence slot, and the march dash pattern must not fight the draw-in dash pattern.
- [ ] **Step 3: Run** `bunx playwright test tests/e2e/drawings.spec.ts` — Expected: all four drawing tests PASS.
- [ ] **Step 4: Look at it** (filmstrip): the halftone must spread from the panel's lower-left after the panel borders; the POW! stamp lands last.
- [ ] **Step 5: Leak check, commit** `feat: intricate Hard Pills drawing`.

---

### Task 7: Drafting frames, buttons, section heads, link sweeps

**Files:** Modify `src/app.css`, `src/lib/components/ProjectSheet.svelte`, `src/routes/work/[slug]/+page.svelte`, `src/lib/components/Hero.svelte`, `src/lib/components/Footer.svelte`, `src/routes/+page.svelte`, `src/lib/components/AlsoBuilt.svelte`, `src/lib/components/Experience.svelte`, `src/lib/client/enhance.js`; Test `tests/e2e/sections.spec.ts`.

- [ ] **Step 1: Failing tests.** Append to `tests/e2e/sections.spec.ts`:
```ts
test('project sheets are drafting frames whose corners extend on hover', async ({ page }) => {
	await page.goto('/');
	const sheet = page.locator('#myne');
	await expect(sheet.locator('[data-corner]')).toHaveCount(4);
	await expect(sheet.locator('.sheet-tb > span')).toHaveText(['SHEET 02 / 04', 'SCALE 1:1', 'REV 26']);
	const corner = sheet.locator('[data-corner="tl"]');
	const before = await corner.evaluate((c) => c.getBoundingClientRect().width);
	await sheet.hover();
	await expect.poll(() => corner.evaluate((c) => c.getBoundingClientRect().width)).toBeGreaterThan(before);
});

test('primary actions share the drafting button style', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('[data-testid="hero"] nav a.btn-draft')).toHaveCount(4);
	await expect(page.locator('#chauffeur a.btn-draft', { hasText: 'View project' })).toHaveCount(1);
});

test('section heads number themselves and their rule draws in', async ({ page }) => {
	await page.goto('/');
	const head = page.locator('.section-head', { has: page.getByRole('heading', { name: 'Experience' }) });
	await head.scrollIntoViewIfNeeded();
	await expect(head).toHaveAttribute('data-revealed', '');
	await expect(head.locator('[data-n]')).toHaveText('03');
});
```
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: CSS** — append to `src/app.css`:
```css
/* ---------- Drafting frames ---------- */
.sheet-corner { position: absolute; width: 12px; height: 12px; pointer-events: none; border-color: var(--color-signal); transition: width var(--dur-m) var(--ease-out), height var(--dur-m) var(--ease-out); }
.sheet-corner[data-corner='tl'] { top: -1px; left: -1px; border-top: 2px solid; border-left: 2px solid; }
.sheet-corner[data-corner='tr'] { top: -1px; right: -1px; border-top: 2px solid; border-right: 2px solid; }
.sheet-corner[data-corner='bl'] { bottom: -1px; left: -1px; border-bottom: 2px solid; border-left: 2px solid; }
.sheet-corner[data-corner='br'] { bottom: -1px; right: -1px; border-bottom: 2px solid; border-right: 2px solid; }
:is(article, header):is(:hover, :focus-within) > .sheet-corner { width: 24px; height: 24px; }
.sheet-tb { position: absolute; top: -1px; right: 28px; display: flex; font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.2em; color: rgb(242 234 216 / 0.75); border: 1px solid var(--color-line-dim); border-top: 0; background: var(--color-ink); }
.sheet-tb > span { padding: 4px 8px; }
.sheet-tb > span + span { border-left: 1px solid var(--color-line-dim); }

/* ---------- Buttons & links ---------- */
.btn-draft { position: relative; display: inline-block; border: 1px solid var(--color-paper); padding: 0.55rem 1rem; font-family: var(--font-mono); font-size: 0.875rem; letter-spacing: 0.12em; text-transform: uppercase; transition: color var(--dur-s) var(--ease-out), border-color var(--dur-s) var(--ease-out), transform var(--dur-s) var(--ease-out); }
.btn-draft::before, .btn-draft::after { content: ''; position: absolute; width: 0; height: 0; border-color: var(--color-signal); transition: width var(--dur-s) var(--ease-out), height var(--dur-s) var(--ease-out); }
.btn-draft::before { top: -5px; left: -5px; border-top: 1px solid; border-left: 1px solid; }
.btn-draft::after { bottom: -5px; right: -5px; border-bottom: 1px solid; border-right: 1px solid; }
.btn-draft:is(:hover, :focus-visible) { color: var(--color-signal); border-color: var(--color-signal); transform: translateY(-1px); }
.btn-draft:is(:hover, :focus-visible)::before, .btn-draft:is(:hover, :focus-visible)::after { width: 10px; height: 10px; }
.btn-draft:active { transform: translateY(0); transition-duration: var(--dur-xs); }
.btn-signal { border-color: var(--color-signal); color: var(--color-signal); }
.link-sweep { padding-bottom: 3px; background: linear-gradient(var(--color-signal), var(--color-signal)) left 100% / 0% 1px no-repeat, linear-gradient(rgb(242 234 216 / 0.35), rgb(242 234 216 / 0.35)) left 100% / 100% 1px no-repeat; transition: background-size var(--dur-m) var(--ease-out), color var(--dur-s) var(--ease-out); }
.link-sweep:is(:hover, :focus-visible) { background-size: 100% 1px, 100% 1px; color: var(--color-signal); }

/* ---------- Section heads & reveals ---------- */
.section-head { display: flex; align-items: center; gap: 1rem; margin-bottom: 2.5rem; }
.section-head [data-n] { font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-signal); letter-spacing: 0.2em; }
.section-head h2 { margin: 0; font-family: var(--font-mono); font-size: 0.875rem; letter-spacing: 0.3em; text-transform: uppercase; color: rgb(242 234 216 / 0.8); }
.section-head [data-rule] { flex: 1; height: 1px; background: var(--color-line-dim); transform-origin: left; }
@media (prefers-reduced-motion: no-preference) {
	html.js .section-head:not([data-revealed]) [data-rule] { transform: scaleX(0); }
	html.js .section-head [data-rule] { transition: transform 1100ms var(--ease-out) 150ms; }
	html.js [data-reveal]:not([data-revealed]) { opacity: 0; transform: translateY(16px); }
	html.js [data-reveal] { transition: opacity var(--dur-l) var(--ease-out), transform var(--dur-l) var(--ease-out); transition-delay: calc(var(--r, 0) * 80ms); }
}
@media (prefers-reduced-motion: no-preference) {
	.carousel-controls > button { transition: transform var(--dur-s) var(--ease-out), color var(--dur-s) var(--ease-out), border-color var(--dur-s) var(--ease-out); }
}
```
- [ ] **Step 4: Markup.**
  - `ProjectSheet.svelte`: inside `<article>` (first children) add
    ```svelte
    	<span class="sheet-corner" data-corner="tl" aria-hidden="true"></span>
    	<span class="sheet-corner" data-corner="tr" aria-hidden="true"></span>
    	<span class="sheet-corner" data-corner="bl" aria-hidden="true"></span>
    	<span class="sheet-corner" data-corner="br" aria-hidden="true"></span>
    ```
    and replace the `SHEET … / 04` span with
    ```svelte
    	<span class="sheet-tb" style:view-transition-name="sheetno-{project.slug}"><span>SHEET {project.sheet} / 04</span><span>SCALE 1:1</span><span>REV 26</span></span>
    ```
    Give the "View project →" link `class="btn-draft"`, and change each project link's classes to `link-sweep self-center` (drop `underline decoration-signal underline-offset-4 hover:text-signal`).
  - `src/routes/work/[slug]/+page.svelte`: same four corner spans + same `sheet-tb` span (with `p.sheet`/`p.slug`) inside the `<header>`; demo link → `class="btn-draft btn-signal"`; project links → `link-sweep`.
  - `Hero.svelte`: nav links `class="btn-draft"` (drop the long Tailwind list).
  - `Footer.svelte`: email link → `class="link-sweep"`.
  - `+page.svelte` and the section components: replace each section `<h2 …>` with
    ```svelte
    <div class="section-head" data-reveal-head><span data-n aria-hidden="true">01</span><h2 id="work-heading">Selected work</h2><span data-rule aria-hidden="true"></span></div>
    ```
    numbering `01` Selected work, `02` Also built (`id="also-heading"`), `03` Experience (`id="exp-heading"`), keeping each existing `id`. Add `data-reveal style="--r: {i}"` to each `<li>` in `AlsoBuilt.svelte` and `Experience.svelte` (use the `{#each … as item, i}` index).
- [ ] **Step 5: Reveal observer** — in `src/lib/client/enhance.js`, before the copy-button block, add:
```js
	// Section heads draw their rule; [data-reveal] blocks rise in. Both once.
	const reveals = document.querySelectorAll('[data-reveal], [data-reveal-head]');
	if (!('IntersectionObserver' in window) || reduce) reveals.forEach((el) => el.setAttribute('data-revealed', ''));
	else {
		const ro = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (!e.isIntersecting) continue;
					e.target.setAttribute('data-revealed', '');
					ro.unobserve(e.target);
				}
			},
			{ threshold: 0.2 }
		);
		reveals.forEach((el) => ro.observe(el));
	}
```
- [ ] **Step 6: Run** `bun run test` — Expected: PASS (existing heading tests still match `h2` text).
- [ ] **Step 7: Leak check, commit** `feat: drafting frames, buttons, section heads and link sweeps`.

---

### Task 8: Hero entrance and availability ping

**Files:** Modify `src/lib/components/Hero.svelte`, `src/app.css`; Test `tests/e2e/hero.spec.ts`.

- [ ] **Step 1: Failing tests.** Append to `tests/e2e/hero.spec.ts`:
```ts
test('hero secondary elements enter; the h1 and photo never animate (LCP)', async ({ page }) => {
	await page.goto('/');
	expect(await page.locator('h1').evaluate((el) => el.getAnimations().length)).toBe(0);
	expect(await page.locator('[data-testid="hero"] img').evaluate((el) => el.getAnimations().length)).toBe(0);
	expect(await page.locator('[data-enter]').count()).toBeGreaterThanOrEqual(6);
	expect(await page.locator('[data-enter]').first().evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
	expect(await page.getByTestId('availability').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
});

test('reduced motion: hero is static', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	expect(await page.getByTestId('hero').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
});
```
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.** In `Hero.svelte` add `data-enter style="--e: N"` to: eyebrow `<p>` (0), role `<p>` (1), pitch `<p>` (2), availability `<p>` (3), `<nav>` (4), the photo frame's two corner spans (5, 6 — also add `data-corner-in="tl"`/`"br"`), the title-block wrapper `<div class="mt-3">` (7). Replace the availability dot's `motion-safe:animate-pulse` with `ping`. Append to `src/app.css`:
```css
/* ---------- Hero entrance ---------- */
@media (prefers-reduced-motion: no-preference) {
	html.js [data-enter] { animation: enter var(--dur-l) var(--ease-out) both; animation-delay: calc(var(--e, 0) * 70ms + 60ms); }
	html.js [data-corner-in] { animation-name: corner-in; }
	html.js [data-corner-in='tl'] { transform-origin: 0 0; }
	html.js [data-corner-in='br'] { transform-origin: 100% 100%; }
	.ping::after { animation: ping 2.4s var(--ease-out) infinite; }
}
@keyframes enter { from { opacity: 0; transform: translateY(12px); filter: blur(3px); } }
@keyframes corner-in { from { transform: scale(0); } }
.ping { position: relative; }
.ping::after { content: ''; position: absolute; inset: 0; border-radius: 9999px; border: 1px solid var(--color-signal); }
@keyframes ping { from { transform: scale(1); opacity: 0.8; } to { transform: scale(3.2); opacity: 0; } }
```
- [ ] **Step 4: Run** `bun run test` — Expected: PASS. Lighthouse locally (`vite preview` + lighthouse on `/`) → still 100 performance; if LCP regresses, the LCP element is animating — check which via the `largest-contentful-paint-element` audit and remove its `data-enter`.
- [ ] **Step 5: Leak check, commit** `feat: hero entrance and availability ping`.

---

### Task 9: Directional, choreographed morph

**Files:** Modify `src/app.html`, `src/app.css`, `src/lib/components/ProjectSheet.svelte`, `src/routes/work/[slug]/+page.svelte`; Test `tests/e2e/work-pages.spec.ts`, `tests/unit/css.test.ts`.

- [ ] **Step 1: Failing tests.** Append to `tests/unit/css.test.ts`:
```ts
describe('morph choreography', () => {
	const html = readFileSync('src/app.html', 'utf8');
	it('tags each navigation forward or back before first render', () => {
		expect(html).toContain("addEventListener('pagereveal'");
		expect(html).toContain("types.add(back ? 'back' : 'forward')");
	});
	it('animates root by direction and groups by class', () => {
		expect(css).toMatch(/:active-view-transition-type\(back\)/);
		for (const c of ['vt-sheet', 'vt-title', 'vt-drawing']) expect(css).toContain(`*.${c}`);
	});
});
```
Append to `tests/e2e/work-pages.spec.ts`:
```ts
test('morph groups carry view-transition classes on both pages', async ({ page }) => {
	for (const url of ['/', '/work/myne']) {
		await page.goto(url);
		const scope = url === '/' ? page.locator('#myne') : page.locator('main');
		const classes = await scope.evaluate((el) =>
			[el, ...el.querySelectorAll('*')].map((n) => getComputedStyle(n).viewTransitionClass).filter((c) => c && c !== 'none').sort()
		);
		expect(classes).toEqual(expect.arrayContaining(['vt-drawing', 'vt-sheet', 'vt-title']));
	}
});

test('after Back from a project, the home page is fully drawn and visible', async ({ page }) => {
	await page.goto('/');
	await page.locator('#myne').getByRole('link', { name: /View project/ }).click();
	await expect(page).toHaveURL('/work/myne');
	await page.goBack();
	await page.locator('#myne').scrollIntoViewIfNeeded();
	await expect(page.locator('#myne figure.drawing')).toHaveAttribute('data-drawn', '', { timeout: 8000 });
	expect(await page.locator('#myne [data-reveal], #myne').evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity))).not.toContain('0');
});
```
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.** In `src/app.html`, inside the existing inline `<script>` (after the fallback `setTimeout`), add:
```js
			// Tag cross-document view transitions with their direction before first render.
			window.addEventListener('pagereveal', function (e) {
				if (!e.viewTransition) return;
				var a = window.navigation && navigation.activation;
				var back = !!(a && a.navigationType === 'traverse' && a.from && a.entry && a.entry.index < a.from.index);
				e.viewTransition.types.add(back ? 'back' : 'forward');
			});
```
In `ProjectSheet.svelte` and the project page header add `style:view-transition-class="vt-sheet"` next to `sheet-*` names, `"vt-title"` next to `title-*`, `"vt-drawing"` next to `drawing-*`. In `src/app.css` replace the `/* ---------- Cross-document morph ---------- */` block (keep its reduced-motion part) with:
```css
/* ---------- Cross-document morph ---------- */
@view-transition { navigation: auto; }
::view-transition-group(*) { animation-duration: 420ms; animation-timing-function: var(--ease-out); }
::view-transition-group(*.vt-sheet) { animation-duration: 560ms; }
::view-transition-group(*.vt-title) { animation-duration: 480ms; }
::view-transition-group(*.vt-drawing) { animation-duration: 620ms; animation-delay: 40ms; }
::view-transition-old(*.vt-title) { animation-duration: 160ms; }
::view-transition-old(root) { animation: vt-out var(--dur-m) var(--ease-out) both; }
::view-transition-new(root) { animation: vt-in-fwd 640ms var(--ease-out) both; }
html:active-view-transition-type(back)::view-transition-new(root) { animation-name: vt-in-back; }
@keyframes vt-out { to { opacity: 0; transform: scale(0.985); } }
@keyframes vt-in-fwd { from { opacity: 0; transform: translateY(18px); } }
@keyframes vt-in-back { from { opacity: 0; transform: translateY(-18px); } }
@media (prefers-reduced-motion: reduce) {
	::view-transition-group(*),
	::view-transition-old(*),
	::view-transition-new(*) { animation: none; }
}
```
- [ ] **Step 4: Run** `bun run test` — Expected: PASS. Record a check video (Task 11 Step 2) to eyeball forward and back.
- [ ] **Step 5: Leak check, commit** `feat: directional, choreographed morph`.

---

### Task 10: Project page reveals and a depth-aware carousel

**Files:** Modify `src/routes/work/[slug]/+page.svelte`, `src/app.css`, `src/lib/client/carousel.js`; Test `tests/e2e/carousel.spec.ts`, `tests/e2e/work-pages.spec.ts`.

- [ ] **Step 1: Failing tests.** Append to `tests/e2e/work-pages.spec.ts`:
```ts
test('write-up sections reveal on scroll; header and carousel are visible at first paint', async ({ page }) => {
	await page.goto('/work/chauffeur');
	expect(await page.locator('main > header').evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
	expect(await page.locator('[data-carousel]').evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
	const sec = page.locator('section[data-reveal]').first();
	await sec.scrollIntoViewIfNeeded();
	await expect.poll(() => sec.evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
});
```
Append to `tests/e2e/carousel.spec.ts`:
```ts
test('active dot becomes a pill and the counter ticks', async ({ page }) => {
	await page.goto('/work/myne');
	const w = (i: number) => page.locator('[data-dot]').nth(i).evaluate((d) => parseFloat(getComputedStyle(d, '::before').width));
	expect(await w(0)).toBeGreaterThan(await w(1));
	await page.locator('[data-next]').click();
	expect(await page.locator('[data-counter]').evaluate((c) => c.getAnimations().length)).toBeGreaterThan(0);
});

test('slides use a scroll-linked depth timeline where supported', async ({ page }) => {
	await page.goto('/work/myne');
	const supported = await page.evaluate(() => CSS.supports('animation-timeline: view()'));
	test.skip(!supported, 'scroll-driven animations unsupported');
	expect(await page.locator('[data-slide] .frame').first().evaluate((f) => getComputedStyle(f).animationName)).toBe('slide-depth');
});
```
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Project page: add `data-reveal style="--r: {i}"` to each write-up `<section>` (use the `{#each sections as [heading, body], i}` index) and `data-reveal` to the prev/next `<nav>`. Do **not** put it on `<header>` or the carousel section.
  - `carousel.js`: add `let ticked = false;` with the other state, and at the end of `setActive` add:
    ```js
    			if (ticked && !reduce) counter.animate([{ transform: 'translateY(40%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    			ticked = true;
    ```
  - `src/app.css` — append:
```css
/* ---------- Carousel refinements ---------- */
[data-dot]::before { transition: inset var(--dur-m) var(--ease-out), background-color var(--dur-s) var(--ease-out), border-radius var(--dur-m) var(--ease-out); }
[data-dot][aria-current='true']::before { inset: 8px 2px; border-radius: 9999px; }
.carousel-controls > [data-prev]:hover { transform: translateX(-2px); }
.carousel-controls > [data-next]:hover { transform: translateX(2px); }
[data-counter] { display: inline-block; }
@supports (animation-timeline: view()) {
	@media (prefers-reduced-motion: no-preference) {
		.slide { view-timeline: --slide inline; }
		.slide > .frame { animation: slide-depth linear both; animation-timeline: --slide; }
		.slide > .frame :is(img, video) { animation: slide-dim linear both; animation-timeline: --slide; }
		html.js .is-enhanced .slide:not([data-active]) { transform: none; }
		html.js .is-enhanced .slide:not([data-active]) .frame :is(img, video) { filter: none; }
	}
}
@keyframes slide-depth { 0% { transform: perspective(900px) rotateY(10deg) scale(0.9); } 50% { transform: none; } 100% { transform: perspective(900px) rotateY(-10deg) scale(0.9); } }
@keyframes slide-dim { 0%, 100% { filter: brightness(0.5) saturate(0.7); } 50% { filter: none; } }
```
- [ ] **Step 4: Run** `bun run test` — Expected: PASS (the earlier "off-centre slides dim only their media" test still holds: the dim keyframes target media only).
- [ ] **Step 5: Leak check, commit** `feat: project page reveals and depth-aware carousel`.

---

### Task 11: Review media, global reduced-motion check, ship

**Files:** Create `scripts/filmstrip.ts`, `scripts/morph-video.ts`; Test `tests/e2e/motion.spec.ts`.

- [ ] **Step 1: Filmstrip script** `scripts/filmstrip.ts` (for human review of each drawing's choreography):
```ts
// Usage: bun scripts/filmstrip.ts [slug]  (needs `bunx vite preview --port 4190` running)
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = process.env.FILMSTRIP_DIR ?? 'filmstrips';
mkdirSync(OUT, { recursive: true });
const slugs = process.argv[2] ? [process.argv[2]] : ['chauffeur', 'myne', 'mri-viewer', 'hard-pills'];
const times = [0, 400, 900, 1600, 2600, 4200, 6500];
const browser = await chromium.launch();
for (const slug of slugs) {
	const frames: string[] = [];
	for (const ms of times) {
		const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
		await page.goto('http://localhost:4190/');
		const fig = page.locator(`#${slug} figure.drawing`);
		await fig.scrollIntoViewIfNeeded();
		await page.waitForTimeout(ms);
		const f = `${OUT}/${slug}-${ms}.png`;
		await fig.screenshot({ path: f });
		frames.push(f);
		await page.close();
	}
	execFileSync('magick', [...frames, '-resize', '360x', '+append', `${OUT}/${slug}-strip.png`]);
	console.log('wrote', `${OUT}/${slug}-strip.png`);
}
await browser.close();
```
Add `filmstrips/` and `morph/` to `.gitignore`. Run it (`bun run build && (bunx vite preview --port 4190 &) ; sleep 3; FILMSTRIP_DIR=$SCRATCH/filmstrips bun scripts/filmstrip.ts; pkill -f "vite preview --port 4190"`) and review all four strips with the Read tool. Fix anything that collides, lands out of order, or looks busy.

- [ ] **Step 2: Morph video** `scripts/morph-video.ts`:
```ts
// Records home → project → back to a GIF for review. Needs `bunx vite preview --port 4190`.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';

const OUT = process.env.MORPH_DIR ?? 'morph';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: OUT, size: { width: 1280, height: 800 } } });
const page = await ctx.newPage();
await page.goto('http://localhost:4190/');
await page.locator('#myne').scrollIntoViewIfNeeded();
await page.waitForTimeout(3500);
await page.locator('#myne').getByRole('link', { name: /View project/ }).click();
await page.waitForTimeout(1800);
await page.goBack();
await page.waitForTimeout(1800);
await ctx.close();
await browser.close();
const webm = readdirSync(OUT).find((f) => f.endsWith('.webm'))!;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${OUT}/${webm}`, '-vf', 'fps=20,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse', `${OUT}/morph.gif`]);
console.log('wrote', `${OUT}/morph.gif`);
```
Run it with `MORPH_DIR=$SCRATCH/morph`; share the GIF path with Yashal for review.

- [ ] **Step 3: Global reduced-motion test** `tests/e2e/motion.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

for (const url of ['/', '/work/chauffeur', '/work/myne', '/work/mri-viewer', '/work/hard-pills']) {
	test(`reduced motion: nothing runs on ${url}`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto(url);
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
		await page.waitForTimeout(800);
		const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
		expect(running).toBe(0);
	});
}
```
Run — Expected: PASS (if not, find the offending animation via `document.getAnimations().map(a => a.animationName ?? a.transitionProperty)` and gate it).
- [ ] **Step 4:** `bun run test && bun run check` → PASS; enhance budget (< 3.5 KB gz) and existing JS budgets green.
- [ ] **Step 5:** Final whole-branch review (fresh reviewer) with this plan's Review Focus and Design notes; fix Critical/Important RED→GREEN; ledger minors.
- [ ] **Step 6:** History leak check on `main..HEAD`; fast-forward `main`; push; Lighthouse 2 runs each on `/`, `/work/myne`, `/work/chauffeur`, `/work/hard-pills` (home 100s, work ≥ 95). Send Yashal the filmstrips and morph GIF.
