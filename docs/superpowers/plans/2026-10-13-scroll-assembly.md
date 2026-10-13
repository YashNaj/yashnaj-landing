# Scroll-assembled Drawings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn each home-page project drawing into an exploded blueprint that the visitor assembles by scrolling. Desktop pins the sheet for 50vh; phones don't pin. Every other visitor keeps today's timed draw-in.

**Architecture:**
- The inline head script decides scrub mode before first paint and sets `html.scrub`.
- In scrub mode, a scroll-driven animation on each sheet's `.pin` wrapper moves one registered custom property, `--sp`, from 0 to 100. Every drawing part derives its state from `--sp` with `calc()`/`clamp()`: stroke dash, opacity, layer `translateZ` and stage tilt. That means:
  - There are no per-element animations.
  - Nothing conflicts with the existing live loops.
  - `--sp`'s initial value of 100 means "finished" wherever no animation runs.
- `enhance.js` gives each part its slot (`--a0`/`--a1`) from the lengths it already measures.
- Each drawing's layers become separate stacked `<svg>` elements, so real 3D works.

**Tech Stack:**
- SvelteKit (adapter-static) and Svelte 5
- Tailwind v4 plus hand CSS in `src/app.css`
- CSS scroll-driven animations (`view-timeline`) and `@property`
- Vanilla `src/lib/client/enhance.js`
- Vitest and Playwright (Chromium)

**Spec:** `docs/superpowers/specs/2026-10-13-scroll-assembly-design.md`

## Global Constraints

- Never name the MRI client anywhere: code, docs, commit messages or chat. The forbidden terms are in the gitignored `.confidential-terms`.
- Before **every** commit, run the leak check as its own step, never chained with a commit or push. Both commands must print 0:
  - `git diff --cached | grep -ciEf .confidential-terms`
  - `git diff --cached --name-only | grep -ciEf .confidential-terms`
- Commit trailer, on every commit:
  - `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  - `Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub`
- `bun run test` runs build, vitest and playwright. Single e2e file: `bunx playwright test tests/e2e/<file>`. It builds and serves via the config's webServer, and reuses a running preview on :4173.
- Budgets:
  - `enhance.js` < 3,584 B gzipped. Currently 1,524.
  - Each `/work/*` page's JS < 4,096 B gzipped. Currently 3,216.
  - Home first-load JS < 30 KB.
- Lighthouse after deploy: home 100 in all four categories with CLS 0; `/work/*` ≥ 95 in all four.
- Spec ranges: drawing window 0–65%; layer collapse and flatten 55–90%; `[data-count]` and `.live` 85–100%. Tilt `rotateX(55deg)`, `perspective: 1200px`, Z spread `var(--depth) * 40px`. The desktop pin is 50vh at `min-width: 768px` and `min-height: 760px`.
- Scrub mode never applies to: `prefers-reduced-motion: reduce`, browsers without `animation-timeline`, no JS (or the 2.5 s fallback dropping `html.js`), `html.restored`, `[data-drawn]` figures (`/work/*`), and print.
- No new dependencies.

## Rulings carried in this plan

These are refinements of the spec. Executors keep them; a reviewer can weigh them.

1. **The scrub switch is a class, not raw CSS conditions.** The spec says "all scrub CSS sits under those three conditions". The inline head script evaluates exactly those conditions before first paint and sets `html.scrub`. The CSS still re-checks `prefers-reduced-motion: no-preference` (and `screen`).
   - Why: CSS and JS read one predicate, and tests can force the Firefox path by stubbing `CSS.supports`. Chromium can't fake an unsupported `@supports`.
   - Cost if wrong: about 150 B of head script.
2. **One driven property (`--sp`) instead of per-element `animation-range`.**
   - Why: it avoids `animation` conflicts with the live loops on `.after.march`, `.knob.after` and `.cursor`, and `--sp`'s initial value of 100 is a safe "finished" default.
   - Cost if wrong: style recalculation on scroll frames for the one visible figure (about 60 elements), on the main thread instead of the compositor.
3. **Axe isn't installed (no new deps).** Accessibility is pinned with explicit role and `aria-hidden` assertions.
   - Cost if wrong: a violation axe would catch beyond those.
4. **In scrub mode the `.cursor` reveal is opacity-only once live.** The `d-press` loop owns its `transform` while the figure is on screen.
   - Cost if wrong: the cursor fades in rather than sliding in.

## Review Focus

These are the cases the spec implies that a reasonable visitor will hit, most likely first. Each one has a test in the task named in brackets.

1. **A wide but short window (1366×700 laptop):** no pin, so the sheet is never stuck half-hidden. The drawing still assembles as it crosses the screen. [Task 3]
2. **Reduced motion switched on after the page loaded:** drawings show finished and flat, and the sheet doesn't pin. [Task 5]
3. **Window resized across the desktop threshold mid-page:** no stuck sheet, and `--sp` stays within 0–100. [Task 3]
4. **Clicking "View project" mid-assembly, then Back:** the project page drawing is flat and finished, and so is the home drawing after Back. [Task 5]
5. **Deep link to `/#myne`:** it lands at or before the pinned start, and scrolling on completes the drawing. Nothing stays hidden. [Task 5]

---

## File map

- `src/lib/drawings/{PhoneNoEffect,PassportVault,ScanSlices,ComicPanels}.svelte`: `<g class="layer">` becomes a stacked `<svg class="layer">` inside `<div class="stack">`. (Task 2)
- `src/app.css`:
  - `.stack` layout and parallax moved to `translate`. (Task 2)
  - Timed rules excluded under `.scrub`; `@property --sp`; `.pin` timeline and pin. (Task 3)
  - Scrub part, layer and stage rules. (Task 4)
- `src/app.html`: the scrub switch. (Task 3)
- `src/lib/components/ProjectSheet.svelte`: the `.pin` wrapper. (Task 3)
- `src/lib/client/enhance.js`: `--a0`/`--a1`/`--cn`, and scrub-mode startup. (Task 4)
- `tests/e2e/helpers.ts` (new): `timedMode`, `scrubTo`, `sp`, `layerSpread`. (Tasks 1 and 3)
- `tests/e2e/parity.spec.ts` (new) plus committed snapshots. (Task 1)
- `tests/e2e/assembly.spec.ts` (new). (Tasks 3–5)
- `tests/e2e/drawings.spec.ts`, `tests/e2e/work.spec.ts`: timed tests pinned to `timedMode`; selectors updated. (Tasks 2 and 3)
- `tests/unit/css.test.ts`, `tests/unit/budget.test.ts`: switch and budget guards. (Tasks 3 and 4)

---

### Task 1: Finished-drawing parity baseline and test helpers

This is a characterization test. It records today's finished drawings so Task 2's restructure can be proven pixel-equivalent. It passes on the current code by design.

**Files:**
- Create: `tests/e2e/helpers.ts`, `tests/e2e/parity.spec.ts`, `tests/e2e/parity.spec.ts-snapshots/*.png` (generated)

**Interfaces:**
- Produces: `timedMode(page: Page): Promise<void>`, used by Tasks 3–5.

- [ ] **Step 1: Create the helpers file**

```ts
// tests/e2e/helpers.ts
import type { Page } from '@playwright/test';

/** Pretend the browser lacks scroll-driven animations, so the timed draw-in runs (the Firefox path). */
export const timedMode = (page: Page) =>
	page.addInitScript(() => {
		const supports = CSS.supports.bind(CSS) as (...a: string[]) => boolean;
		CSS.supports = ((...a: string[]) => (/animation-timeline/.test(a.join(':')) ? false : supports(...a))) as typeof CSS.supports;
	});
```

- [ ] **Step 2: Write the parity spec**

```ts
// tests/e2e/parity.spec.ts
import { expect, test } from '@playwright/test';

// Finished drawings must look the same after the layer restructure (separate stacked SVGs).
test.use({ viewport: { width: 1280, height: 900 } });
for (const slug of ['chauffeur', 'myne', 'mri-viewer', 'hard-pills']) {
	test(`${slug} finished drawing is unchanged`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		const fig = page.locator(`#${slug} figure.drawing`);
		await fig.scrollIntoViewIfNeeded();
		await expect(fig).toHaveScreenshot(`${slug}.png`, { maxDiffPixelRatio: 0.01, animations: 'disabled' });
	});
}
```

- [ ] **Step 3: Record the baseline on the current code**

Run: `bunx playwright test tests/e2e/parity.spec.ts --update-snapshots`
Expected: 4 passed, and 4 PNGs written under `tests/e2e/parity.spec.ts-snapshots/`.

- [ ] **Step 4: Confirm the baseline is stable**

Run: `bunx playwright test tests/e2e/parity.spec.ts`
Expected: 4 passed.

- [ ] **Step 5: Leak check (its own step)**

```bash
git add tests/e2e/helpers.ts tests/e2e/parity.spec.ts tests/e2e/parity.spec.ts-snapshots
git diff --cached | grep -ciEf .confidential-terms
git diff --cached --name-only | grep -ciEf .confidential-terms
```
Expected: `0` and `0`.

- [ ] **Step 6: Commit**

```bash
git commit -m "test: finished-drawing parity baseline and timed-mode helper

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub"
```

---

### Task 2: Layers become stacked SVGs

**Files:**
- Modify: all four `src/lib/drawings/*.svelte`
- Modify: `src/app.css`, at the `.drawing .layer` rule (currently `transform: translate(...)` with `transition: transform 600ms`) and its reduced-motion counterpart
- Test: `tests/e2e/drawings.spec.ts`

**Interfaces:**
- Produces: every drawing is `<div class="stack">` containing ≥ 4 × `<svg class="layer" viewBox="0 0 400 300" aria-hidden="true" style="--depth: N">`. Parallax is written to the CSS `translate` property; `transform` on `.layer` is free for Task 4.

- [ ] **Step 1: Update the structure tests (RED)**

In `tests/e2e/drawings.spec.ts`, replace the per-slug "layered and intricate" test body with:

```ts
	test(`${slug} drawing is layered and intricate`, async ({ page }) => {
		await page.goto('/');
		const fig = page.locator(`#${slug} figure.drawing`);
		const layers = fig.locator('.stack > svg.layer');
		expect(await layers.count()).toBeGreaterThanOrEqual(4);
		for (const l of await layers.all()) {
			await expect(l).toHaveAttribute('aria-hidden', 'true');
			await expect(l).toHaveAttribute('viewBox', '0 0 400 300');
		}
		expect(await fig.locator('[role="img"]').count()).toBe(0); // the figure is the one image
		await expect(fig).toHaveAttribute('role', 'img');
		expect(await fig.locator('.stroke, .after, .c, .type').count()).toBeGreaterThanOrEqual(30);
		expect(await fig.locator('.live, .wobble, .bob, .march, .vp, .knob').count()).toBeGreaterThanOrEqual(1);
	});
```

In the "fine pointer shifts depth layers" test, change the layer locator and the property it reads:

```ts
	const top = fig.locator('.stack > svg.layer').last();
	await expect.poll(() => top.evaluate((l) => getComputedStyle(l).translate)).not.toMatch(/^(none|0px( 0px)?)$/);
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bunx playwright test tests/e2e/drawings.spec.ts -g "layered|fine pointer"`
Expected: FAIL. The layered tests find 0 `.stack > svg.layer`, and the pointer test times out on the locator.

- [ ] **Step 3: Restructure the four drawings with a one-off script**

Save it as `$SCRATCHPAD/split-layers.mjs`. It isn't committed. Run it from the repo root:

```js
// node split-layers.mjs src/lib/drawings/*.svelte
import { readFileSync, writeFileSync } from 'node:fs';
const OPEN = '<svg viewBox="0 0 400 300" aria-hidden="true">';
for (const file of process.argv.slice(2)) {
	let s = readFileSync(file, 'utf8');
	if (!s.startsWith(OPEN)) throw new Error(`${file}: unexpected root`);
	s = s.slice(OPEN.length).replace(/<\/svg>\s*$/, '');
	// top-level <defs> (before the first layer) travel into the first layer svg; ids stay document-global
	const firstLayer = s.indexOf('\t<g class="layer"');
	const lead = s.slice(0, firstLayer).trim();
	let body = s.slice(firstLayer);
	let first = true;
	body = body.replace(/^\t<g class="layer" style="([^"]+)">\n/gm, (_, style) => {
		const open = `\t<svg class="layer" viewBox="0 0 400 300" aria-hidden="true" style="${style}">\n`;
		const extra = first && lead ? lead.replace(/^/gm, '\t\t') + '\n' : '';
		first = false;
		return open + extra;
	});
	body = body.replace(/^\t<\/g>$/gm, '\t</svg>'); // layer closers are the only one-tab </g>
	writeFileSync(file, `<div class="stack">\n${body.trimEnd()}\n</div>\n`);
}
```

Run: `node $SCRATCHPAD/split-layers.mjs src/lib/drawings/*.svelte && grep -c '<svg class="layer"' src/lib/drawings/*.svelte && grep -c '<g class="layer"' src/lib/drawings/*.svelte`
Expected: each file has `4` layer SVGs and `0` layer groups. Open one file and check the result is balanced: the first layer SVG contains the old top-level `<defs>`, and ComicPanels' inner `<defs><mask>` stays in its layer.

- [ ] **Step 4: CSS for the stack and parallax via `translate`**

In `src/app.css`, replace the `.drawing .layer { transform: translate(...); transition: transform 600ms var(--ease-out); }` rule with:

```css
.drawing .stack { display: grid; }
.drawing .stack > svg { grid-area: 1 / 1; }
.drawing .layer {
	translate: calc(var(--px, 0) * var(--depth, 0) * 1.6px) calc(var(--py, 0) * var(--depth, 0) * 1.6px);
	transition: translate 600ms var(--ease-out);
}
```

In the `@media (prefers-reduced-motion: reduce), print` block, change `.drawing .layer { transition: none; transform: none; }` to `.drawing .layer { transition: none; translate: none; }`.

- [ ] **Step 5: Run structure, parity and drawing tests (GREEN)**

Run: `bunx playwright test tests/e2e/drawings.spec.ts tests/e2e/parity.spec.ts tests/e2e/work.spec.ts`
Expected: all pass, including the 4 parity screenshots. If parity fails, open the diff image in `test-results/`. Grid stacking with `height: auto` must give every layer the same box; the usual fix is `.drawing .stack > svg { width: 100%; }`, and that is the only CSS change allowed for parity.

- [ ] **Step 6: Type check**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 7: Leak check (its own step)**

```bash
git add src/lib/drawings src/app.css tests/e2e/drawings.spec.ts
git diff --cached | grep -ciEf .confidential-terms
git diff --cached --name-only | grep -ciEf .confidential-terms
```
Expected: `0` and `0`.

- [ ] **Step 8: Commit**

```bash
git commit -m "refactor: drawing layers become stacked SVGs (real 3D ahead); parallax uses translate

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub"
```

---

### Task 3: Scrub switch, pin and the `--sp` timeline

**Files:**
- Modify: `src/app.html` (inline head script, after the `restored` line)
- Modify: `src/lib/components/ProjectSheet.svelte` (wrap `<article>` in `.pin`)
- Modify: `src/app.css` (timed-rule prefixes, `@property --sp`, pin block)
- Modify: `tests/e2e/helpers.ts`, `tests/e2e/drawings.spec.ts`, `tests/e2e/work.spec.ts`, `tests/unit/css.test.ts`
- Create: `tests/e2e/assembly.spec.ts`

**Interfaces:**
- Consumes: `timedMode` (Task 1).
- Produces:
  - `html.scrub` class.
  - `.pin` wrapper with `view-timeline: --sheet`.
  - Inherited registered `--sp: <number>` (0–100, initial 100) on every element in a sheet.
  - Helpers `scrubTo(page, slug, p)`, `sp(page, slug)` and `layerSpread(page, slug)`.
  - Range map: viewports at `(min-width: 768px) and (min-height: 760px)` use `--r0: 90vh`; all others use `--r0: 20vh`. Both use `--span: 50vh`. `--sp` runs 0→100 over `cover var(--r0)` → `cover calc(var(--r0) + var(--span))`.

- [ ] **Step 1: Add the scroll helpers**

Append to `tests/e2e/helpers.ts`:

```ts
/** Scroll so the sheet `slug` sits at scrub progress p (0–100) for the current viewport. Mirrors app.css's range map. */
export const scrubTo = (page: Page, slug: string, p: number) =>
	page.evaluate(
		([slug, p]) => {
			const pin = document.getElementById(slug)!.closest('.pin')!;
			const vh = innerHeight;
			const T = pin.getBoundingClientRect().top + scrollY;
			const r0 = matchMedia('(min-width: 768px) and (min-height: 760px)').matches ? 0.9 : 0.2;
			scrollTo({ top: T - vh + (r0 + (p / 100) * 0.5) * vh, behavior: 'instant' });
		},
		[slug, p] as [string, number]
	);

/** The sheet's scrub progress as the drawing sees it. */
export const sp = (page: Page, slug: string) =>
	page.locator(`#${slug} figure.drawing`).evaluate((f) => parseFloat(getComputedStyle(f).getPropertyValue('--sp')));

/** Vertical spread (px) between the drawing's layer SVGs: 0 when assembled flat. */
export const layerSpread = (page: Page, slug: string) =>
	page.locator(`#${slug} figure.drawing`).evaluate((f) => {
		const tops = [...f.querySelectorAll('.stack > svg.layer')].map((l) => l.getBoundingClientRect().top);
		return Math.max(...tops) - Math.min(...tops);
	});
```

- [ ] **Step 2: Write the failing switch and pin tests**

```ts
// tests/e2e/assembly.spec.ts
import { expect, test } from '@playwright/test';
import { scrubTo, sp, timedMode } from './helpers';

const sheetTop = (page: import('@playwright/test').Page) =>
	page.locator('#myne').evaluate((a) => a.getBoundingClientRect().top);

test.describe('scrub switch', () => {
	test('is on in a capable browser with motion allowed', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('html')).toHaveClass(/\bscrub\b/);
	});
	test('is off with reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await expect(page.locator('html')).not.toHaveClass(/\bscrub\b/);
	});
	test('is off without scroll-driven animations', async ({ page }) => {
		await timedMode(page);
		await page.goto('/');
		await expect(page.locator('html')).not.toHaveClass(/\bscrub\b/);
	});
	test('is off on a return trip ("All work")', async ({ page }) => {
		await page.goto('/work/chauffeur');
		await page.getByRole('link', { name: /All work/ }).click();
		await expect(page.locator('html')).toHaveClass(/\brestored\b/);
		await expect(page.locator('html')).not.toHaveClass(/\bscrub\b/);
	});
});

test.describe('pin', () => {
	test('desktop: the sheet holds still while --sp runs 0 → 100', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/');
		const tops: number[] = [];
		for (const p of [0, 50, 100]) {
			await scrubTo(page, 'myne', p);
			await expect.poll(() => sp(page, 'myne')).toBeCloseTo(p, -1); // within ±5
			tops.push(await sheetTop(page));
		}
		expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
		expect(tops[0]).toBeCloseTo(90, 0); // pinned at 10vh
	});
	test('phone: no pin, no extra space, --sp still runs 0 → 100', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/');
		expect(await page.locator('#myne').evaluate((a) => getComputedStyle(a.parentElement!).paddingBottom)).toBe('0px');
		await scrubTo(page, 'myne', 0);
		await expect.poll(() => sp(page, 'myne')).toBeLessThan(5);
		const t0 = await sheetTop(page);
		await scrubTo(page, 'myne', 100);
		await expect.poll(() => sp(page, 'myne')).toBeGreaterThan(95);
		expect(t0 - (await sheetTop(page))).toBeGreaterThan(300);
	});
	test('wide but short window (1366×700): no pin', async ({ page }) => {
		await page.setViewportSize({ width: 1366, height: 700 });
		await page.goto('/');
		expect(await page.locator('#myne').evaluate((a) => getComputedStyle(a.parentElement!).paddingBottom)).toBe('0px');
		expect(await page.locator('#myne').evaluate((a) => getComputedStyle(a).position)).not.toBe('sticky');
		await scrubTo(page, 'myne', 100);
		await expect.poll(() => sp(page, 'myne')).toBeGreaterThan(95);
	});
	test('resizing across the desktop threshold never strands a sheet', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/');
		await scrubTo(page, 'myne', 50);
		await page.setViewportSize({ width: 600, height: 900 });
		await expect.poll(() => page.locator('#myne').evaluate((a) => getComputedStyle(a).position)).not.toBe('sticky');
		const v = await sp(page, 'myne');
		expect(v).toBeGreaterThanOrEqual(0);
		expect(v).toBeLessThanOrEqual(100);
		await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
		await expect.poll(() => sp(page, 'myne')).toBe(100);
	});
});
```

Add to `tests/unit/css.test.ts`, inside the `morph choreography` describe or a new describe:

```ts
describe('scrub switch', () => {
	const html = readFileSync('src/app.html', 'utf8');
	it('is decided in the head before first render, from the same three conditions as the spec', () => {
		expect(html).toContain("CSS.supports('animation-timeline: view()')");
		expect(html).toContain("matchMedia('(prefers-reduced-motion: no-preference)')");
		expect(html).toMatch(/!document\.documentElement\.classList\.contains\('restored'\)[\s\S]*classList\.add\('scrub'\)/);
	});
	it('registers --sp with a finished default', () => {
		expect(css).toMatch(/@property --sp \{ syntax: '<number>'; inherits: true; initial-value: 100; \}/);
	});
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `bunx vitest run tests/unit/css.test.ts && bunx playwright test tests/e2e/assembly.spec.ts`
Expected: FAIL. The unit tests miss the strings. In e2e, `scrub` is absent, `.closest('.pin')` returns null, and `--sp` parses as NaN.

- [ ] **Step 4: The switch, in `src/app.html`**

Insert directly after the line ending `document.documentElement.classList.add('restored');`:

```js
			// Scroll drives the home drawings where the browser can (app.css "Scroll-assembled drawings").
			if (!document.documentElement.classList.contains('restored') && window.CSS && CSS.supports('animation-timeline: view()') && matchMedia('(prefers-reduced-motion: no-preference)').matches) document.documentElement.classList.add('scrub');
```

- [ ] **Step 5: The pin wrapper, in `ProjectSheet.svelte`**

Wrap the whole `<article …>…</article>` element in `<div class="pin">` … `</div>`. Leave every attribute on `<article>` unchanged: `id`, `data-testid`, the `view-transition-name`s and the classes.

- [ ] **Step 6: Keep the timed draw out of scrub mode, in `src/app.css`**

In the block between `/* hidden-until-drawn states …` and `/* history traversal …`:
- Change every selector prefix `html.js:not(.restored) [data-draw]` to `html.js:not(.restored):not(.scrub) [data-draw]`.
- Change every `html.js [data-draw]` to `html.js:not(.scrub) [data-draw]`.

Leave the `/* history traversal */` rules and the reduced-motion/print block unchanged. Check the result:

Run: `sed -n '/hidden-until-drawn/,/history traversal/p' src/app.css | grep -c 'not(.scrub)'`
Expected: `18` (every rule line in that block).

- [ ] **Step 7: `--sp` and the pin, in `src/app.css`**

Append a new section after the `/* ---------- Carousel refinements ---------- */` block:

```css
/* ---------- Scroll-assembled drawings (html.scrub is set in app.html before first paint) ---------- */
@property --sp { syntax: '<number>'; inherits: true; initial-value: 100; }
@keyframes sp { from { --sp: 0; } to { --sp: 100; } }
@media screen and (prefers-reduced-motion: no-preference) {
	/* --sp runs 0 → 100 over cover r0 → r0+span: phones while the sheet crosses the screen, desktop while it is pinned */
	html.js.scrub .pin { --r0: 20vh; --span: 50vh; view-timeline: --sheet; animation: sp linear both; animation-timeline: --sheet; animation-range: cover var(--r0) cover calc(var(--r0) + var(--span)); }
	@media (min-width: 768px) and (min-height: 760px) {
		html.js.scrub .pin { --r0: 90vh; padding-bottom: var(--span); }
		html.js.scrub .pin > article { position: sticky; top: 10vh; }
	}
}
```

- [ ] **Step 8: Pin the timed-behaviour tests to the timed path**

These tests exercise the time-based draw-in, which Chromium now replaces with scrub mode. Import the helper and add `await timedMode(page);` as the first line of each of these tests:
- `tests/e2e/drawings.spec.ts`:
  - `stroke timing follows real path length…`
  - `loops run only while a finished drawing is on screen…`
  - `a drawing scrolled past before it finishes never goes live off-screen`
  - `chauffeur dimension counts up to its final value`
- `tests/e2e/work.spec.ts`: `a drawing starts undrawn and draws when scrolled into view`

The import line in each file is `import { timedMode } from './helpers';`.

- [ ] **Step 9: Run the new and touched tests (GREEN)**

Run: `bunx vitest run tests/unit/css.test.ts && bunx playwright test tests/e2e/assembly.spec.ts tests/e2e/drawings.spec.ts tests/e2e/work.spec.ts tests/e2e/work-pages.spec.ts tests/e2e/parity.spec.ts`
Expected: all pass. The drawings still render finished in scrub mode at this point, because the Task 4 rules don't exist yet and the timed hidden states no longer apply. That's expected.

- [ ] **Step 10: Leak check (its own step)**

```bash
git add src/app.html src/app.css src/lib/components/ProjectSheet.svelte tests
git diff --cached | grep -ciEf .confidential-terms
git diff --cached --name-only | grep -ciEf .confidential-terms
```
Expected: `0` and `0`.

- [ ] **Step 11: Commit**

```bash
git commit -m "feat: scrub switch, sheet pin and scroll progress (--sp) for home drawings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub"
```

---

### Task 4: Assembly — slots, strokes, parts and 3D layers

**Files:**
- Modify: `src/lib/client/enhance.js` (`splitType`, `choreograph`, scrub startup)
- Modify: `src/app.css` (scrub rules inside the Task 3 section)
- Modify: `tests/e2e/assembly.spec.ts`, `tests/unit/budget.test.ts`

**Interfaces:**
- Consumes: `html.scrub`, `--sp`, `.pin`, `scrubTo`, `sp` and `layerSpread` (Task 3); `.stack > svg.layer[style*=--depth]` (Task 2).
- Produces:
  - Inline `--a0`/`--a1` (numbers 0–100, as strings with one decimal) on every element matched by `.stroke, .after, .type, .stamp, .cursor, .unlock, .slide-out, .grow, [data-count]`.
  - `--cn` (character count) on each `text.type`.
  - In scrub mode the engine never sets `data-drawn` on home figures and never runs `countUp`.

- [ ] **Step 1: Write the failing assembly tests**

Append to `tests/e2e/assembly.spec.ts`. Extend the existing helpers import to `import { layerSpread, scrubTo, sp, timedMode } from './helpers';`.

```ts
test.describe('assembly (desktop)', () => {
	test.use({ viewport: { width: 1280, height: 900 } });
	const dash = (page: import('@playwright/test').Page) =>
		page.locator('#myne figure.drawing .stroke').evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).strokeDashoffset)));

	test('scroll assembles the drawing, and scrolling back takes it apart', async ({ page }) => {
		await page.goto('/');
		await scrubTo(page, 'myne', 0);
		await expect.poll(() => sp(page, 'myne')).toBeLessThan(1);
		expect(await layerSpread(page, 'myne')).toBeGreaterThan(20);
		expect(Math.min(...(await dash(page)))).toBeGreaterThan(0.9);
		await scrubTo(page, 'myne', 40);
		await expect.poll(() => sp(page, 'myne')).toBeCloseTo(40, -1);
		const mid = await dash(page);
		expect(mid.some((d) => d === 0)).toBe(true); // early strokes done
		expect(mid.some((d) => d > 0.5)).toBe(true); // late strokes still to come
		expect(await layerSpread(page, 'myne')).toBeGreaterThan(20); // still exploded before 55%
		await scrubTo(page, 'myne', 100);
		await expect.poll(() => sp(page, 'myne')).toBeGreaterThan(99);
		await expect.poll(() => layerSpread(page, 'myne')).toBeLessThan(1);
		expect(Math.max(...(await dash(page)))).toBe(0);
		await scrubTo(page, 'myne', 0);
		await expect.poll(() => layerSpread(page, 'myne')).toBeGreaterThan(20);
		expect(Math.min(...(await dash(page)))).toBeGreaterThan(0.9);
	});

	test('each part gets a scroll slot in document order inside the 0–65 window; counts land at 85–100', async ({ page }) => {
		await page.goto('/');
		const slots = await page.locator('#chauffeur figure.drawing').evaluate((f) =>
			[...f.querySelectorAll('.stroke, .after, .type, .stamp, .cursor, .unlock, .slide-out, .grow, [data-count]')].map((el) => ({
				a0: parseFloat((el as HTMLElement).style.getPropertyValue('--a0')),
				a1: parseFloat((el as HTMLElement).style.getPropertyValue('--a1')),
				count: el.hasAttribute('data-count')
			}))
		);
		const parts = slots.filter((s) => !s.count);
		for (let i = 0; i < parts.length; i++) {
			expect(parts[i].a0).toBeGreaterThanOrEqual(0);
			expect(parts[i].a1).toBeLessThanOrEqual(65);
			expect(parts[i].a1).toBeGreaterThan(parts[i].a0);
			if (i) expect(parts[i].a0).toBeGreaterThanOrEqual(parts[i - 1].a0);
		}
		for (const c of slots.filter((s) => s.count)) expect([c.a0, c.a1]).toEqual([85, 100]);
	});

	test('typed labels type with scroll; counts, callouts and live parts land last at their final value', async ({ page }) => {
		await page.goto('/');
		await page.evaluate(() => {
			(window as any).__seen = [];
			const t = document.querySelector('#chauffeur text[data-count="260"]')!;
			new MutationObserver(() => (window as any).__seen.push(t.textContent)).observe(t, { childList: true, characterData: true, subtree: true });
		});
		const label = page.locator('#chauffeur text.type').first();
		const count = page.locator('#chauffeur text[data-count="260"]');
		const live = page.locator('#chauffeur .live').first();
		const op = (l: import('@playwright/test').Locator) => l.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
		await scrubTo(page, 'chauffeur', 0);
		await expect.poll(() => sp(page, 'chauffeur')).toBeLessThan(1);
		expect(await label.locator('tspan').evaluateAll((ts) => ts.map((t) => getComputedStyle(t).opacity))).not.toContain('1');
		await scrubTo(page, 'chauffeur', 80);
		await expect.poll(() => sp(page, 'chauffeur')).toBeCloseTo(80, -1);
		expect(await op(count)).toBe(0);
		expect(await op(live)).toBe(0);
		await scrubTo(page, 'chauffeur', 100);
		await expect.poll(() => sp(page, 'chauffeur')).toBeGreaterThan(99);
		expect(new Set(await label.locator('tspan').evaluateAll((ts) => ts.map((t) => getComputedStyle(t).opacity)))).toEqual(new Set(['1']));
		expect(await op(count)).toBe(1);
		expect(await op(live)).toBe(1);
		await expect(count).toHaveText('H 260');
		expect(await page.evaluate(() => (window as any).__seen.length)).toBe(0); // never counted
		await expect(page.locator('#chauffeur figure.drawing')).toHaveAttribute('data-live', '');
	});

	test('the construction layer is visible from the start', async ({ page }) => {
		await page.goto('/');
		await scrubTo(page, 'myne', 0);
		await expect.poll(() => sp(page, 'myne')).toBeLessThan(1);
		expect(await page.locator('#myne figure.drawing .c').first().evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
	});
});
```

Add to `tests/unit/budget.test.ts`:

```ts
describe('drawing engine budget', () => {
	it('enhance.js stays under 3.5 KB gzipped', () => {
		const dir = 'build/_app/immutable/assets';
		const file = readdirSync(dir).find((f) => /^enhance[.-][\w-]+\.js$/.test(f))!;
		expect(gzipSync(readFileSync(join(dir, file))).length).toBeLessThan(3584);
	});
});
```

Change the import at the top of that file to `import { existsSync, readdirSync, readFileSync } from 'node:fs';`.

- [ ] **Step 2: Run them and watch them fail**

Run: `bunx playwright test tests/e2e/assembly.spec.ts -g "assembly"`
Expected: FAIL. `layerSpread` is 0 at `sp` 0 because nothing is exploded yet, and `--a0` is NaN because the engine doesn't write slots yet.

- [ ] **Step 3: The engine, in `src/lib/client/enhance.js`**

Below `const restored = …`, add:

```js
	const scrub = document.documentElement.classList.contains('scrub'); // scroll drives home drawings (app.html)
	const WINDOW = 65; // strokes and parts draw over the first 65% of a sheet's scroll range
```

In `splitType`, after `t.textContent = '';`, add:

```js
			t.style.setProperty('--cn', String(s.length));
```

Replace the whole `choreograph` function with:

```js
	// Start time (--t) for every part; duration (--d) for strokes from their real length;
	// and the same order as scroll slots (--a0/--a1, % of the sheet's range) for scrub mode.
	const choreograph = (fig) => {
		fig.querySelectorAll('.c').forEach((el, i) => el.style.setProperty('--t', `${i * 40}ms`));
		let t = START;
		let end = START;
		const parts = [];
		for (const el of fig.querySelectorAll('.stroke, .after, .type, .stamp, .cursor, .unlock, .slide-out, .grow, [data-count]')) {
			el.style.setProperty('--t', `${Math.round(t)}ms`);
			const isStroke = el.classList.contains('stroke') && 'getTotalLength' in el;
			const d = isStroke ? clamp(el.getTotalLength() * 2.4, 280, 1400) : 700;
			if (isStroke) el.style.setProperty('--d', `${Math.round(d)}ms`);
			parts.push([el, t, d]);
			end = Math.max(end, t + d);
			t += isStroke ? d * OVERLAP : 90;
		}
		for (const [el, t0, d] of parts) {
			const count = el.hasAttribute('data-count'); // counts land with the callouts, at their final value
			el.style.setProperty('--a0', count ? '85' : ((t0 / end) * WINDOW).toFixed(1));
			el.style.setProperty('--a1', count ? '100' : (((t0 + d) / end) * WINDOW).toFixed(1));
		}
		return end;
	};
```

Directly after the line `figs.forEach((f) => state.set(f, { done: false, visible: false, started: false }));`, add:

```js
	// Scrub mode: slots are laid out up front; scroll does the drawing, so figures count as done (live = on screen).
	if (scrub)
		figs.forEach((f) => {
			if (f.hasAttribute('data-drawn')) return;
			splitType(f);
			choreograph(f);
			Object.assign(state.get(f), { done: true, started: true });
		});
```

- [ ] **Step 4: The scrub rules, in `src/app.css`**

Inside the Task 3 `@media screen and (prefers-reduced-motion: no-preference)` block, after the nested desktop `@media`, add:

```css
	/* --k: layers collapse and the sheet flattens over 55–90%; --q: each part's progress through its own slot */
	html.js.scrub [data-draw]:not([data-drawn]) { --k: clamp(0, (var(--sp) - 55) / 35, 1); perspective: 1200px; }
	html.js.scrub [data-draw]:not([data-drawn]) .stack { transform-style: preserve-3d; transform: rotateX(calc(55deg * (1 - var(--k)))); }
	html.js.scrub [data-draw]:not([data-drawn]) .layer { transform: translateZ(calc(var(--depth, 0) * 40px * (1 - var(--k)))); will-change: transform; }
	html.js.scrub [data-draw]:not([data-drawn]) :is(.stroke, .after, .type, .stamp, .cursor, .unlock, .slide-out, .grow) {
		--a0: 0;
		--a1: 65;
		--q: clamp(0, (var(--sp) - var(--a0)) / (var(--a1) - var(--a0)), 1);
	}
	html.js.scrub [data-draw]:not([data-drawn]) .stroke { stroke-dasharray: 1; stroke-dashoffset: calc(1 - var(--q)); }
	html.js.scrub [data-draw]:not([data-drawn]) :is(.after, .cursor):not(.stroke) { opacity: var(--q); }
	html.js.scrub [data-draw]:not([data-drawn]) .stamp { opacity: var(--q); transform: rotate(calc(-10deg + 7deg * var(--q))) scale(calc(1.5 - 0.5 * var(--q))); }
	html.js.scrub [data-draw]:not([data-drawn]) .cursor { transform: translate(calc(36px * (1 - var(--q))), calc(30px * (1 - var(--q)))); }
	html.js.scrub [data-draw]:not([data-drawn]) .unlock { transform: rotate(calc(-120deg * (1 - var(--q)))); }
	html.js.scrub [data-draw]:not([data-drawn]) .slide-out { transform: translateX(calc(-40px * (1 - var(--q)))); }
	html.js.scrub [data-draw]:not([data-drawn]) .grow { transform: scale(var(--q)); }
	/* letters arrive one by one across the label's slot */
	html.js.scrub [data-draw]:not([data-drawn]) .type tspan { opacity: clamp(0, (var(--sp) - var(--a0)) / (var(--a1) - var(--a0)) * var(--cn, 1) - var(--ci, 0), 1); }
	html.js.scrub [data-draw]:not([data-drawn]) .live { opacity: clamp(0, (var(--sp) - 85) / 15, 1); }
```

- [ ] **Step 5: Run the assembly tests (GREEN)**

Run: `bunx playwright test tests/e2e/assembly.spec.ts`
Expected: all pass.
- If `layerSpread` stays 0 at `sp` 0, check that `.stack` keeps `preserve-3d`. The `figure` must not have `overflow` other than visible, and `.drawing svg { overflow: visible }` must stay.
- If `--q` resolves wrong on tspans, check that `--a0`/`--a1` are inherited from the parent `text` (they're inline on the text, not on the tspan).

- [ ] **Step 6: Full suite, budgets and type check**

Run: `bun run test > $WS/t4.log 2>&1; tail -30 $WS/t4.log; bun run check`
Expected:
- vitest all pass, including `drawing engine budget` and `project page JS budget`
- playwright all pass
- svelte-check 0 errors

- [ ] **Step 7: Leak check (its own step)**

```bash
git add src/lib/client/enhance.js src/app.css tests
git diff --cached | grep -ciEf .confidential-terms
git diff --cached --name-only | grep -ciEf .confidential-terms
```
Expected: `0` and `0`.

- [ ] **Step 8: Commit**

```bash
git commit -m "feat: drawings assemble with scroll — exploded layers, scrubbed strokes, typed labels

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub"
```

---

### Task 5: Fallbacks and edge cases

**Files:**
- Modify: `tests/e2e/assembly.spec.ts`
- Modify: `src/app.css` or `src/lib/client/enhance.js`, only if a test below fails. Each such fix needs a `Ruling:` ledger line.

**Interfaces:**
- Consumes: everything from Tasks 2–4.

- [ ] **Step 1: Write the fallback and edge tests**

Append to `tests/e2e/assembly.spec.ts`:

```ts
test.describe('everyone else gets finished, flat drawings and no pin', () => {
	test.use({ viewport: { width: 1280, height: 900 } });
	const flatAndFinished = async (page: import('@playwright/test').Page, slug = 'myne') => {
		await page.locator(`#${slug}`).scrollIntoViewIfNeeded();
		await expect.poll(() => layerSpread(page, slug)).toBeLessThan(1);
		await expect
			.poll(() => page.locator(`#${slug} figure.drawing .stroke`).evaluateAll((els) => Math.max(...els.map((el) => parseFloat(getComputedStyle(el).strokeDashoffset)))), { timeout: 10000 })
			.toBe(0);
		expect(await page.locator(`#${slug}`).evaluate((a) => getComputedStyle(a.parentElement!).paddingBottom)).toBe('0px');
	};

	test('reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await flatAndFinished(page);
	});
	test('reduced motion switched on after load', async ({ page }) => {
		await page.goto('/');
		await scrubTo(page, 'myne', 0);
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await flatAndFinished(page);
	});
	test('no scroll-driven animations (timed draw-in instead)', async ({ page }) => {
		await timedMode(page);
		await page.goto('/');
		await flatAndFinished(page);
		await expect(page.locator('#myne figure.drawing')).toHaveAttribute('data-drawn', '');
	});
	test('print', async ({ page }) => {
		await page.goto('/');
		await page.emulateMedia({ media: 'print' });
		await flatAndFinished(page);
	});
	test('the project page drawing', async ({ page }) => {
		await page.goto('/work/myne');
		const fig = page.locator('header figure.drawing');
		const tops = await fig.evaluate((f) => [...f.querySelectorAll('.stack > svg.layer')].map((l) => l.getBoundingClientRect().top));
		expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);
	});
	test('clicking through mid-assembly, then Back', async ({ page }) => {
		await page.goto('/');
		await scrubTo(page, 'myne', 60);
		await page.locator('#myne').getByRole('link', { name: /View project/ }).click();
		await expect(page).toHaveURL('/work/myne');
		const fig = page.locator('header figure.drawing');
		const tops = await fig.evaluate((f) => [...f.querySelectorAll('.stack > svg.layer')].map((l) => l.getBoundingClientRect().top));
		expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);
		await page.goBack();
		await expect(page.locator('html')).toHaveClass(/\brestored\b/);
		await flatAndFinished(page);
	});
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
	test('drawings are finished and flat, and nothing pins', async ({ page }) => {
		await page.goto('/');
		await page.locator('#myne').scrollIntoViewIfNeeded();
		expect(await layerSpread(page, 'myne')).toBeLessThan(1);
		expect(await page.locator('#myne').evaluate((a) => getComputedStyle(a.parentElement!).paddingBottom)).toBe('0px');
		expect(await page.locator('#myne figure.drawing .stroke').first().evaluate((el) => getComputedStyle(el).strokeDashoffset)).toMatch(/^0(px)?$/);
	});
});

test('a deep link to a sheet lands before its pin, and scrolling on completes it', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/#myne');
	await expect.poll(() => sp(page, 'myne')).toBeLessThan(10);
	await scrubTo(page, 'myne', 100);
	await expect.poll(() => layerSpread(page, 'myne')).toBeLessThan(1);
});
```

- [ ] **Step 2: Run them**

Run: `bunx playwright test tests/e2e/assembly.spec.ts`
Expected: all pass. These guard behaviour Tasks 3–4 designed in.
- **If one passes before you have reason to trust it:** confirm it can fail. Temporarily delete `:not(.scrub)` from one timed rule (or remove `screen` from the scrub `@media`) and watch the matching fallback test fail. Then restore it.
- **If one fails:** that is a real defect. Fix it with the smallest change in `app.css`/`enhance.js`, and record a `Ruling:` in the ledger. One likely failure is `reduced motion switched on after load`: the `html.scrub` class persists, but the CSS gates are `@media`, so it should pass. If it doesn't, the timed hidden rules were left excluded under `.scrub`. The fix is to wrap those exclusions in the same media query.

- [ ] **Step 3: Full suite and type check**

Run: `bun run test > $WS/t5.log 2>&1; tail -30 $WS/t5.log; bun run check`
Expected: all vitest and playwright pass; 0 svelte-check errors.

- [ ] **Step 4: Leak check (its own step)**

```bash
git add tests src
git diff --cached | grep -ciEf .confidential-terms
git diff --cached --name-only | grep -ciEf .confidential-terms
```
Expected: `0` and `0`.

- [ ] **Step 5: Commit**

```bash
git commit -m "test: scroll assembly fallbacks — reduced motion, timed path, print, no JS, morph and Back, deep links

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub"
```

---

## After the last task

- **Filmstrip:** with `scripts/filmstrip.ts` (from plan 2), or a short Playwright script, capture `#myne` at `--sp` 0, 25, 50, 75 and 100 at 1280×900, plus the same at 390×844, for the user.
- **Final whole-branch review:** on the most capable model, with the Review Focus list above verbatim.
- **Merge and deploy:** fast-forward into `main` and push only with the user's go-ahead. Pushing `main` deploys through Workers Builds. Then verify https://yashnaj.dev and run mobile Lighthouse 3× on `/` and each `/work/*`. Targets: home 100 in all four categories with CLS 0; `/work/*` ≥ 95.
