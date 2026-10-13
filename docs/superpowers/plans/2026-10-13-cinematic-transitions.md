# Cinematic Transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the page-to-page morph with "the drawing leads". Home folds away while the drawing carries you into the case study, which arrives in two beats. Back reverses the move, and prev/next slide sideways. Every move finishes within 800 ms.

**Architecture:**
- **CSS (`src/app.css`):** the transitions are pure CSS on the `::view-transition-*` pseudo-elements, keyed by three things:
  - the view-transition **type** (`forward` / `back` / `next` / `prev`);
  - the **landing page**, via `html:has([data-vt-page=…])`, so the demo and 404 keep today's crossfade;
  - **one-sidedness**, via `:only-child` on `::view-transition-old/new`.
- **Head script (`src/app.html`):** a few lines hand the prev/next/"All work" direction to the next page through `sessionStorage`.
- **Markup (`/work/[slug]`):** gains the `case-head` and `case-body` names that drive the two beats.

**Tech Stack:**
- SvelteKit (adapter-static, no client router on `/work/*`) and Svelte 5
- Tailwind v4 (Lightning CSS) plus `src/app.css`
- Vitest and Playwright

**Spec:** `docs/superpowers/specs/2026-10-13-cinematic-transitions-design.md`

## Global Constraints

- **Confidentiality:** never name the MRI client anywhere (code, docs, commit messages, chat). The forbidden terms are in the gitignored `.confidential-terms`.
- **Leak check:** before **every** commit, run these as their own step, never chained with a commit or push. Both must print `0`:
  - `git diff --cached | grep -ciEf .confidential-terms`
  - `git diff --cached --name-only | grep -ciEf .confidential-terms`
- **Commit trailer:**
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub
  ```
- **Lighthouse (mobile):** home 100, `/work/*` ≥ 95.
- **JS budget:** each `/work/*` page under 4,096 B gzipped JS, inline head script included (`tests/unit/budget.test.ts`).
- **Ceiling:** every view-transition animation's duration plus delay is ≤ 800 ms.
- **Reduced motion:** no view-transition animations at all.
- **Return trips** (Back, "All work") land on finished drawings (`html.restored`, unchanged).
- **DNS:** never touch it (and never the Proton Mail records). Any DNS change goes to the user as a `!` command.

## Facts found while planning (read these first)

1. **Headless shell can't run these tests.** Playwright's default Chromium headless shell never runs cross-document view transitions: `pagereveal` fires with `viewTransition === null`. The new headless mode (`channel: 'chromium'`) does run them. Every test that watches a real transition sets `test.use({ channel: 'chromium' })` at the top of its file.
2. **The real timing is observable.** During a transition, `document.getAnimations()` on the new page lists every `::view-transition-*` animation. `effect.pseudoElement` names it, and `effect.getComputedTiming().endTime` is its duration plus delay. That is the ground truth for the 800 ms ceiling.
3. **The other sheets don't fold with the root.** Home names all four sheets (`sheet-`, `sheetno-`, `drawing-`, `title-<slug>`). On forward, the three sheets you didn't click become **old-only** groups, outside the root snapshot. A fold applied only to `::view-transition-old(root)` would leave them flat, fading in place, so the fold also targets `::view-transition-old(*):only-child`. On prev/next, every sheet group is one-sided, which is exactly `:only-child` too.
4. **Every page shares `app.css`, demo and 404 included.** Cross-document pseudo-elements are styled by the **new** page's CSS. Unscoped forward rules would fold the page when you open the MRI demo, which the spec rules out. The cinematic rules are therefore gated on the landing page: `data-vt-page="case"` on `/work/[slug]`'s `<main>`, `data-vt-page="home"` on home's `<main>`.
5. **Specificity beats the reduced-motion rule.** The reduced-motion rule `::view-transition-*(*) { animation: none }` has specificity (0,0,1), so any typed or `:has()` rule outranks it. All cinematic rules live inside `@media (prefers-reduced-motion: no-preference)`.
6. **Durations go in raw `ms`, not tokens.** The ceiling test parses the CSS, so this block avoids `var(--dur-*)` for times. Easing tokens stay.

## Review Focus

1. **Modified click on Next** (cmd/ctrl/shift-click, middle click). The link opens in a new tab, and this tab must not keep a `vt-dir` that would mis-type its next navigation. The click handler ignores modified and non-primary clicks. Task 1 has a test.
2. **A navigation with no view transition** (new tab, reload, reduced-motion browser) must still clear `vt-dir`. The read and clear happen before the `if (!e.viewTransition) return`. Task 1 has a test.
3. **Reduced motion during a real transition:** no `::view-transition-*` animation should exist. Task 3 has a test.
4. **Opening the MRI demo from its case study** keeps the plain root crossfade: no fold, and `old(root)` runs `vt-out`. Task 3 has a test.
5. **Blocked `sessionStorage`** (it throws) must not break navigation, and the type falls back to forward/back. Task 1 has a test.

---

### Task 1: Direction hand-off

**Files:**
- Modify: `src/app.html` (inline head script)
- Modify: `src/routes/work/[slug]/+page.svelte:34` and `:78-79` (link attributes)
- Create: `tests/unit/head-script.test.ts`
- Create: `tests/e2e/transitions.spec.ts`
- Modify: `tests/unit/css.test.ts` (the old `types.add(back ? 'back' : 'forward')` string assertion)

**Interfaces:**
- Produces:
  - `data-vt-dir` link attribute: `"prev" | "next" | "back"`;
  - `sessionStorage['vt-dir']`;
  - view-transition types: `forward | back | next | prev`. Exactly one is added per transition.
- Consumes: nothing.

**Ruling:** the spec says `data-sibling` on prev/next only. This plan uses one attribute, `data-vt-dir`, and also puts `data-vt-dir="back"` on "← All work". That link is a push navigation, so today it is typed `forward`, and it would fold the work page as if it were going deeper.

- [ ] **Step 1: Write the failing unit test.** It runs the real head script against stubs.

`tests/unit/head-script.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const code = readFileSync('src/app.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)![1];

type Opts = { stored?: string | null; blocked?: boolean; traverseBack?: boolean };
function boot({ stored = null, blocked = false, traverseBack = false }: Opts = {}) {
	const store = new Map<string, string>(stored ? [['vt-dir', stored]] : []);
	const sessionStorage = {
		getItem: (k: string) => { if (blocked) throw new Error('blocked'); return store.get(k) ?? null; },
		setItem: (k: string, v: string) => { if (blocked) throw new Error('blocked'); store.set(k, v); },
		removeItem: (k: string) => { if (blocked) throw new Error('blocked'); store.delete(k); }
	};
	const handlers: Record<string, (e: any) => void> = {};
	const document = {
		documentElement: { classList: { add() {}, remove() {}, contains: () => true } },
		querySelector: () => null,
		referrer: '',
		addEventListener: (t: string, f: any) => (handlers['doc:' + t] = f)
	};
	const window = { addEventListener: (t: string, f: any) => (handlers['win:' + t] = f), navigation: undefined as any };
	const navigation = traverseBack ? { activation: { navigationType: 'traverse', from: { index: 2 }, entry: { index: 1 } } } : { activation: { navigationType: 'push', from: { index: 1 }, entry: { index: 2 } } };
	window.navigation = navigation;
	new Function('window', 'document', 'performance', 'location', 'navigation', 'sessionStorage', 'setTimeout', code)(
		window, document, { getEntriesByType: () => [] }, { origin: 'https://yashnaj.dev', pathname: '/work/myne' }, navigation, sessionStorage, () => {}
	);
	const reveal = (withTransition = true) => {
		const types = new Set<string>();
		handlers['win:pagereveal']({ viewTransition: withTransition ? { types } : null });
		return [...types];
	};
	const click = (dir: string | null, mods: Partial<MouseEvent> = {}) =>
		handlers['doc:click']({ button: 0, defaultPrevented: false, ...mods, target: { closest: () => (dir ? { getAttribute: () => dir } : null) } });
	return { store, reveal, click };
}

describe('view-transition direction hand-off', () => {
	it('push navigation is forward, Back traversal is back', () => {
		expect(boot().reveal()).toEqual(['forward']);
		expect(boot({ traverseBack: true }).reveal()).toEqual(['back']);
	});
	it('a stored direction wins once, then is cleared', () => {
		const b = boot({ stored: 'next' });
		expect(b.reveal()).toEqual(['next']);
		expect(b.store.has('vt-dir')).toBe(false);
		expect(boot({ stored: 'prev' }).reveal()).toEqual(['prev']);
	});
	it('clears a stored direction even when the arrival has no view transition', () => {
		const b = boot({ stored: 'next' });
		expect(b.reveal(false)).toEqual([]);
		expect(b.store.has('vt-dir')).toBe(false);
	});
	it('a plain click on a [data-vt-dir] link stores its direction', () => {
		const b = boot();
		b.click('next');
		expect(b.store.get('vt-dir')).toBe('next');
	});
	it('ignores modified, non-primary, prevented and unrelated clicks', () => {
		for (const mods of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
			const b = boot();
			b.click('next', mods as Partial<MouseEvent>);
			expect(b.store.has('vt-dir'), JSON.stringify(mods)).toBe(false);
		}
		const b = boot();
		b.click(null);
		expect(b.store.has('vt-dir')).toBe(false);
	});
	it('blocked storage falls back to forward/back without throwing', () => {
		const b = boot({ blocked: true });
		expect(() => b.click('next')).not.toThrow();
		expect(b.reveal()).toEqual(['forward']);
	});
});
```

- [ ] **Step 2: Run it to check it fails.**

Run: `bunx vitest run tests/unit/head-script.test.ts`

Expected: FAIL, with `handlers['doc:click'] is not a function` and the stored-direction cases returning `['forward']`.

- [ ] **Step 3: Implement the change in `src/app.html`.** Replace the `pagereveal` block with:

```js
			// Prev/next and "All work" tell the next page which way to move.
			document.addEventListener('click', function (e) {
				var a = e.target.closest && e.target.closest('[data-vt-dir]');
				if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
				try { sessionStorage.setItem('vt-dir', a.getAttribute('data-vt-dir')); } catch (_) {}
			});
			// Tag cross-document view transitions with their direction before first render.
			window.addEventListener('pagereveal', function (e) {
				var dir = null;
				try { dir = sessionStorage.getItem('vt-dir'); sessionStorage.removeItem('vt-dir'); } catch (_) {}
				if (!e.viewTransition) return;
				var a = window.navigation && navigation.activation;
				var back = !!(a && a.navigationType === 'traverse' && a.from && a.entry && a.entry.index < a.from.index);
				e.viewTransition.types.add(dir || (back ? 'back' : 'forward'));
			});
```

In `tests/unit/css.test.ts`, replace the assertion
`expect(html).toContain("types.add(back ? 'back' : 'forward')");`
with `expect(html).toContain("types.add(dir || (back ? 'back' : 'forward'))");`.

- [ ] **Step 4: Run the unit test to check it passes.**

Run: `bunx vitest run tests/unit/head-script.test.ts tests/unit/css.test.ts`

Expected: PASS.

- [ ] **Step 5: Write the failing e2e test (real browser types).**

`tests/e2e/transitions.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';

// The default headless shell never runs cross-document view transitions; new headless does.
test.use({ channel: 'chromium' });

// Record the types (and every view-transition animation's end time) of the transition that reveals each page.
async function watch(page: Page) {
	await page.addInitScript(() => {
		addEventListener('pagereveal', (e: any) => {
			if (!e.viewTransition) return;
			e.viewTransition.ready.then(() => {
				sessionStorage.setItem('vt-log', JSON.stringify({
					path: location.pathname,
					types: [...e.viewTransition.types],
					anims: document.getAnimations()
						.filter((a) => String((a.effect as KeyframeEffect).pseudoElement).startsWith('::view-transition'))
						.map((a) => ({ el: (a.effect as KeyframeEffect).pseudoElement, name: (a as CSSAnimation).animationName, end: Number(a.effect!.getComputedTiming().endTime) }))
				}));
			}, () => {});
		});
	});
}
const lastLog = async (page: Page, path: string) => {
	await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('vt-log') ?? '{}').path)).toBe(path);
	await page.waitForTimeout(900); // let the transition finish before the next click
	return page.evaluate(() => JSON.parse(sessionStorage.getItem('vt-log')!)) as Promise<{ types: string[]; anims: { el: string; name: string; end: number }[] }>;
};
export { watch, lastLog };

test('each navigation is typed by direction', async ({ page }) => {
	await watch(page);
	await page.goto('/');
	await page.locator('#myne').getByRole('link', { name: /View project/ }).click();
	expect((await lastLog(page, '/work/myne')).types).toEqual(['forward']);
	await page.getByRole('link', { name: /^Next:/ }).click();
	expect((await lastLog(page, '/work/mri-viewer')).types).toEqual(['next']);
	await page.getByRole('link', { name: /Previous:/ }).click();
	expect((await lastLog(page, '/work/myne')).types).toEqual(['prev']);
	await page.goBack();
	expect((await lastLog(page, '/work/mri-viewer')).types).toEqual(['back']);
	await page.getByRole('link', { name: /All work/ }).click();
	expect((await lastLog(page, '/')).types).toEqual(['back']);
});

test('a modifier-click on Next leaves no direction behind', async ({ page }) => {
	await page.goto('/work/myne');
	await page.evaluate(() => {
		addEventListener('click', (e) => e.preventDefault()); // window listener runs after the document one; stop the navigation
		document.querySelector('[data-vt-dir="next"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }));
	});
	expect(await page.evaluate(() => sessionStorage.getItem('vt-dir'))).toBeNull();
});
```

- [ ] **Step 6: Run it to check it fails.**

Run: `bunx playwright test transitions`

Expected: FAIL. The `next` step records `['forward']`, and the modifier test's `querySelector` returns null.

- [ ] **Step 7: Add the attributes in `src/routes/work/[slug]/+page.svelte`.**

```svelte
	<a href="/#work" data-vt-dir="back" class="font-mono text-xs tracking-[0.3em] text-paper/80 uppercase hover:text-signal">← All work</a>
```

```svelte
		<a class="hover:text-signal" href="/work/{data.prev.slug}" data-vt-dir="prev">← Previous: {data.prev.title}</a>
		<a class="hover:text-signal" href="/work/{data.next.slug}" data-vt-dir="next">Next: {data.next.title} →</a>
```

- [ ] **Step 8: Run the tests to check they pass.**

Run: `bunx playwright test transitions work-pages && bunx vitest run`

Expected: PASS (the vitest budget test reads `build/`, which Playwright's webServer has just rebuilt).

- [ ] **Step 9: Run the leak check (its own step).** Run the two greps from Global Constraints. Both must print `0`.

- [ ] **Step 10: Commit.**

```bash
git add src/app.html src/routes/work/[slug]/+page.svelte tests/unit/head-script.test.ts tests/unit/css.test.ts tests/e2e/transitions.spec.ts
git commit -m "feat: prev/next and All work hand their direction to the next page's view transition" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub"
```

---

### Task 2: Two-beat markup and page markers

**Files:**
- Modify: `src/routes/work/[slug]/+page.svelte` (main, header text column, and a body wrapper)
- Modify: `src/routes/+page.svelte:24` (main marker)
- Modify: `tests/e2e/work-pages.spec.ts:44-60` (the shared-names test)
- Modify: `tests/e2e/transitions.spec.ts`

**Interfaces:**
- Produces:
  - view-transition names `case-head` and `case-body`, once per `/work/[slug]` page;
  - `main[data-vt-page="case"]` on `/work/[slug]`;
  - `main[data-vt-page="home"]` on `/`.
- Consumes: nothing.

- [ ] **Step 1: Write the failing test.** Append to `tests/e2e/transitions.spec.ts`:

```ts
test('case studies expose the two beats once each, and pages mark themselves', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('main[data-vt-page="home"]')).toHaveCount(1);
	for (const slug of ['chauffeur', 'myne', 'mri-viewer', 'hard-pills']) {
		await page.goto(`/work/${slug}`);
		await expect(page.locator('main[data-vt-page="case"]')).toHaveCount(1);
		const names = await page.evaluate(() => [...document.querySelectorAll('*')].map((n) => getComputedStyle(n).viewTransitionName));
		expect(names.filter((n) => n === 'case-head'), slug).toHaveLength(1);
		expect(names.filter((n) => n === 'case-body'), slug).toHaveLength(1);
		// the footer stays in the root snapshot
		expect(await page.locator('footer').evaluate((f) => !!f.closest('[style*="case-body"]'))).toBe(false);
	}
});
```

In `tests/e2e/work-pages.spec.ts`, the shared-names test compares the whole work page's names with the home sheet's. Change its `target` filter so the two page-only beats are excluded:

```ts
			[...document.querySelectorAll('*')].map((n) => getComputedStyle(n).viewTransitionName).filter((n) => n && n !== 'none' && n !== 'root' && !n.startsWith('case-')).sort()
```

- [ ] **Step 2: Run the test to check it fails.**

Run: `bunx playwright test transitions -g "two beats"`

Expected: FAIL, because `main[data-vt-page="home"]` has count 0.

- [ ] **Step 3: Implement the markup.**

**Home** (`src/routes/+page.svelte:24`):

```svelte
<main class="mx-auto max-w-6xl px-4 md:px-8" data-vt-page="home">
```

**Work page:**

- On `<main>`, add `data-vt-page="case"`.
- On the header text column `<div class="min-w-0">`, add `style:view-transition-name="case-head"`.
- Wrap the gallery `<section>`, the write-up grid `<div>`, the MRI sample note `{#if}` and the prev/next `<nav>` in one `<div style:view-transition-name="case-body">`. `<Footer />` stays outside it.

```svelte
<main class="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-16" data-vt-page="case">
```

```svelte
		<div class="min-w-0" style:view-transition-name="case-head">
```

```svelte
	<div style:view-transition-name="case-body">
		<section class="py-12" aria-labelledby="gallery-heading">
			…unchanged…
		</section>

		<div class="grid gap-10 md:grid-cols-2">
			…unchanged…
		</div>

		{#if p.slug === 'mri-viewer'}…unchanged…{/if}

		<nav data-reveal class="mt-16 …" aria-label="More projects">
			…unchanged (with Task 1's data-vt-dir)…
		</nav>
	</div>
	<Footer />
</main>
```

- [ ] **Step 4: Run the tests to check they pass.**

Run: `bunx playwright test transitions work-pages carousel`

Expected: PASS. The carousel tests confirm the wrapper didn't disturb scroll-snap.

- [ ] **Step 5: Screenshot check.** Pure layout guard: take a full-page screenshot of `/work/myne` at 390×844 and 1280×800 (scratchpad), and compare by eye with production `https://yashnaj.dev/work/myne`. They must be identical.

- [ ] **Step 6: Run the leak check (its own step).** Both greps must print `0`.

- [ ] **Step 7: Commit.**

```bash
git add src/routes/+page.svelte src/routes/work/[slug]/+page.svelte tests/e2e/work-pages.spec.ts tests/e2e/transitions.spec.ts
git commit -m "feat: case studies expose case-head and case-body for the two-beat arrival" -m "<trailer>"
```

(`<trailer>` = the two Global Constraints lines, verbatim.)

---

### Task 3: The transitions (CSS) and the ceiling

**Files:**
- Modify: `src/app.css:321-338` (replace the "Cross-document morph" block)
- Modify: `tests/unit/css.test.ts`
- Modify: `tests/e2e/transitions.spec.ts`

**Interfaces:**
- Consumes:
  - the types from Task 1;
  - `case-head`, `case-body` and `data-vt-page` from Task 2;
  - the existing classes `vt-sheet`, `vt-drawing` and `vt-title`.
- Produces: keyframes `vt-fold`, `vt-unfold`, `vt-lift`, `vt-settle`, `vt-rise`, `vt-rise-far`, `vt-fade-in`, `vt-fade-out`, `vt-slide-out-left`, `vt-slide-in-right`, `vt-slide-out-right` and `vt-slide-in-left`.

- [ ] **Step 1: Write the failing unit tests.** Replace the `morph choreography` describe in `tests/unit/css.test.ts`:

```ts
describe('morph choreography', () => {
	const html = readFileSync('src/app.html', 'utf8');
	const block = css.slice(css.indexOf('/* ---------- Cross-document transitions'), css.indexOf('/* the copy button'));
	const ms = (s: string) => [...s.matchAll(/(\d+(?:\.\d+)?)(ms|s)\b/g)].map((m) => Number(m[1]) * (m[2] === 's' ? 1000 : 1));

	it('tags each navigation by direction before first render', () => {
		expect(html).toContain("addEventListener('pagereveal'");
		expect(html).toContain("types.add(dir || (back ? 'back' : 'forward'))");
	});
	it('styles every direction and the two beats', () => {
		for (const t of ['back', 'next', 'prev']) expect(block).toContain(`:active-view-transition-type(${t})`);
		for (const n of ['case-head', 'case-body', '*.vt-sheet', '*.vt-title', '*.vt-drawing']) expect(block).toContain(n);
		for (const k of ['vt-fold', 'vt-unfold', 'vt-lift', 'vt-settle', 'vt-rise', 'vt-rise-far']) expect(block).toContain(`@keyframes ${k} `);
	});
	it('no animation in the block runs past 800 ms (duration + delay)', () => {
		expect(block.length).toBeGreaterThan(500);
		expect(block).not.toMatch(/var\(--dur-/); // times are literal so this test can read them
		for (const [, body] of block.matchAll(/\{([^{}]*)\}/g)) {
			const short = body.match(/(?:^|;)\s*animation:\s*([^;]+)/);
			const total = short
				? ms(short[1]).slice(0, 2).reduce((a, b) => a + b, 0)
				: Math.max(...ms(body.match(/animation-duration:\s*([^;]+)/)?.[1] ?? '0ms')) + Math.max(...ms(body.match(/animation-delay:\s*([^;]+)/)?.[1] ?? '0ms'));
			expect(total, body.trim()).toBeLessThanOrEqual(800);
		}
	});
	it('every animation sits behind no-preference, and reduced motion stops them all', () => {
		const outside = block.replace(/@media \(prefers-reduced-motion: (no-preference|reduce)\) \{[\s\S]*?\n\}/g, '');
		expect(outside).not.toMatch(/animation(-name)?:\s*vt-/);
		expect(block).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*::view-transition-group\(\*\),\s*::view-transition-image-pair\(\*\),\s*::view-transition-old\(\*\),\s*::view-transition-new\(\*\) \{ animation: none !important; \}/);
	});
});
```

**Ruling:** the baseline crossfade (demo, 404) moves inside `no-preference` too. The reduced-motion rule gains `!important` and `image-pair`, so no future rule can outrank it.

- [ ] **Step 2: Run them to check they fail.**

Run: `bunx vitest run tests/unit/css.test.ts`

Expected: FAIL. The block marker isn't found (so `block.length` is ≤ 500), and there's no `vt-fold`.

- [ ] **Step 3: Write the failing e2e tests.** Append to `tests/e2e/transitions.spec.ts`:

```ts
test('every transition finishes within 800 ms and runs the intended moves', async ({ page }) => {
	await watch(page);
	await page.goto('/');
	await page.locator('#myne').getByRole('link', { name: /View project/ }).click();
	const fwd = await lastLog(page, '/work/myne');
	await page.getByRole('link', { name: /^Next:/ }).click();
	const next = await lastLog(page, '/work/mri-viewer');
	await page.getByRole('link', { name: /Previous:/ }).click();
	const prev = await lastLog(page, '/work/myne');
	await page.getByRole('link', { name: /All work/ }).click();
	const back = await lastLog(page, '/');
	for (const log of [fwd, next, prev, back]) {
		expect(log.anims.length).toBeGreaterThan(0);
		for (const a of log.anims) expect(a.end, `${log.types} ${a.el}`).toBeLessThanOrEqual(800);
	}
	const has = (log: typeof fwd, el: string, name: string) => log.anims.some((a) => a.el === el && a.name === name);
	expect(has(fwd, '::view-transition-old(root)', 'vt-fold')).toBe(true);
	expect(has(fwd, '::view-transition-old(sheet-chauffeur)', 'vt-fold')).toBe(true); // the unclicked sheets fold too
	expect(has(fwd, '::view-transition-new(drawing-myne)', 'vt-settle')).toBe(true);
	expect(has(fwd, '::view-transition-image-pair(drawing-myne)', 'vt-lift')).toBe(true);
	expect(has(fwd, '::view-transition-new(case-head)', 'vt-rise')).toBe(true);
	expect(has(fwd, '::view-transition-new(case-body)', 'vt-rise-far')).toBe(true);
	expect(has(next, '::view-transition-old(drawing-myne)', 'vt-slide-out-left')).toBe(true);
	expect(has(next, '::view-transition-new(sheet-mri-viewer)', 'vt-slide-in-right')).toBe(true);
	expect(has(prev, '::view-transition-old(title-mri-viewer)', 'vt-slide-out-right')).toBe(true);
	expect(has(prev, '::view-transition-new(drawing-myne)', 'vt-slide-in-left')).toBe(true);
	expect(has(back, '::view-transition-new(root)', 'vt-unfold')).toBe(true);
	expect(has(back, '::view-transition-old(case-body)', 'vt-fade-out')).toBe(true);
	expect(back.anims.some((a) => a.name === 'vt-settle' || a.name === 'vt-lift')).toBe(false);
});

test('the MRI demo keeps the plain crossfade', async ({ page }) => {
	await watch(page);
	await page.goto('/work/mri-viewer');
	await page.locator('main header a.btn-signal').click();
	const log = await lastLog(page, '/work/mri-viewer/demo');
	expect(log.anims.find((a) => a.el === '::view-transition-old(root)')?.name).toBe('vt-out');
	expect(log.anims.some((a) => a.name === 'vt-fold')).toBe(false);
});

test('reduced motion: a real transition runs no animations', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await watch(page);
	await page.goto('/');
	await page.locator('#myne').getByRole('link', { name: /View project/ }).click();
	expect((await lastLog(page, '/work/myne')).anims).toEqual([]);
});
```

- [ ] **Step 4: Run them to check they fail.**

Run: `bunx playwright test transitions`

Expected: FAIL. There's no `vt-fold` on forward, and the drawing group ends at 660 ms but the old root and title rules don't match.

- [ ] **Step 5: Implement the CSS.** Replace `src/app.css` lines 321–338 (`/* ---------- Cross-document morph ---------- */` through the reduced-motion block) with:

```css
/* ---------- Cross-document transitions ----------
   The new page's CSS styles the transition. Types come from the head script in app.html
   (forward / back / next / prev). data-vt-page on <main> says where we landed:
     case  ← forward: home folds away, the drawing leads, the case study arrives in two beats
     home  ← back: the beats fade, the drawing glides home, home unfolds
     case  ← next / prev: the one-sided sheet groups slide sideways
   Anything else (MRI demo, 404) keeps a root crossfade. Times are literal: tests/unit/css.test.ts
   holds every duration + delay in this block to 800 ms. */
@view-transition { navigation: auto; }
@media (prefers-reduced-motion: no-preference) {
	::view-transition-group(*) { animation-duration: 420ms; animation-timing-function: var(--ease-out); }
	::view-transition-group(*.vt-sheet) { animation-duration: 500ms; }
	::view-transition-group(*.vt-title) { animation-duration: 480ms; }
	::view-transition-old(*.vt-title) { animation-duration: 160ms; }
	::view-transition-group(*.vt-drawing) { animation-duration: 550ms; }
	::view-transition-old(root) { animation: vt-out 420ms var(--ease-out) both; }
	::view-transition-new(root) { animation: vt-in-fwd 640ms var(--ease-out) both; }
	html:active-view-transition-type(back)::view-transition-new(root) { animation-name: vt-in-back; }

	/* the case study arrives in two beats; going away, both fade fast */
	::view-transition-new(case-head) { animation: vt-rise 300ms var(--ease-out) 350ms both; }
	::view-transition-new(case-body) { animation: vt-rise-far 350ms var(--ease-out) 450ms both; }
	::view-transition-old(case-head), ::view-transition-old(case-body) { animation: vt-fade-out 200ms var(--ease-out) both; }

	/* forward into a case study: home (root and the unclicked sheets) folds back; the drawing lifts and settles */
	html:has([data-vt-page='case']):not(:active-view-transition-type(back, next, prev))::view-transition-old(root),
	html:has([data-vt-page='case']):not(:active-view-transition-type(back, next, prev))::view-transition-old(*):only-child { animation: vt-fold 250ms var(--ease-out) both; transform-origin: 50% 100%; }
	html:has([data-vt-page='case']):not(:active-view-transition-type(back, next, prev))::view-transition-new(root) { animation: vt-fade-in 250ms var(--ease-out) both; }
	html:has([data-vt-page='case']):not(:active-view-transition-type(back, next, prev))::view-transition-image-pair(*.vt-drawing) { animation: vt-lift 550ms var(--ease-out); }
	html:has([data-vt-page='case']):not(:active-view-transition-type(back, next, prev))::view-transition-new(*.vt-drawing) { animation: vt-settle 550ms var(--ease-out) both; }

	/* back to home: the old page fades, home (root and the other sheets) unfolds from just above */
	html:active-view-transition-type(back):has([data-vt-page='home'])::view-transition-old(root) { animation: vt-fade-out 200ms var(--ease-out) both; }
	html:active-view-transition-type(back):has([data-vt-page='home'])::view-transition-new(root),
	html:active-view-transition-type(back):has([data-vt-page='home'])::view-transition-new(*):only-child { animation: vt-unfold 450ms var(--ease-out) 100ms both; transform-origin: 50% 100%; }
	html:active-view-transition-type(back):has([data-vt-page='home'])::view-transition-group(*.vt-drawing) { animation-duration: 450ms; }

	/* next / prev: every sheet group is one-sided (names carry the slug); next flips leftward, prev mirrors.
	   The root (background, "All work", footer) is the same on both pages: swap it without a fade. */
	html:active-view-transition-type(next, prev)::view-transition-old(root),
	html:active-view-transition-type(next, prev)::view-transition-new(root) { animation: none; }
	html:active-view-transition-type(next)::view-transition-old(*):only-child { animation: vt-slide-out-left 450ms var(--ease-out) both; }
	html:active-view-transition-type(next)::view-transition-new(*):only-child { animation: vt-slide-in-right 450ms var(--ease-out) both; }
	html:active-view-transition-type(prev)::view-transition-old(*):only-child { animation: vt-slide-out-right 450ms var(--ease-out) both; }
	html:active-view-transition-type(prev)::view-transition-new(*):only-child { animation: vt-slide-in-left 450ms var(--ease-out) both; }
}
@keyframes vt-out { to { opacity: 0; transform: scale(0.985); } }
@keyframes vt-in-fwd { from { opacity: 0; transform: translateY(18px); } }
@keyframes vt-in-back { from { opacity: 0; transform: translateY(-18px); } }
@keyframes vt-fade-in { from { opacity: 0; } }
@keyframes vt-fade-out { to { opacity: 0; } }
@keyframes vt-fold { to { opacity: 0; transform: perspective(1200px) translateY(-24px) rotateX(10deg) scale(0.97); } }
@keyframes vt-unfold { from { opacity: 0; transform: perspective(1200px) translateY(-24px) rotateX(10deg) scale(0.97); } }
@keyframes vt-lift { 50% { transform: scale(1.04); filter: drop-shadow(0 0 18px rgb(255 122 61 / 0.35)); } }
@keyframes vt-settle { from { opacity: 0; transform: perspective(900px) rotateY(8deg); } }
@keyframes vt-rise { from { opacity: 0; transform: translateY(12px); } }
@keyframes vt-rise-far { from { opacity: 0; transform: translateY(20px); } }
@keyframes vt-slide-out-left { to { opacity: 0; transform: translateX(-40px); } }
@keyframes vt-slide-in-right { from { opacity: 0; transform: translateX(40px); } }
@keyframes vt-slide-out-right { to { opacity: 0; transform: translateX(40px); } }
@keyframes vt-slide-in-left { from { opacity: 0; transform: translateX(-40px); } }
@media (prefers-reduced-motion: reduce) {
	::view-transition-group(*),
	::view-transition-image-pair(*),
	::view-transition-old(*),
	::view-transition-new(*) { animation: none !important; }
}
```

**Notes for the implementer:**
- **The glow colour:** `rgb(255 122 61 / 0.35)` is `--color-signal` (`#ff7a3d`) at 35%. A literal is used because custom properties inside `@keyframes` on view-transition pseudos resolve against `html`; that works, but a literal keeps the keyframe self-contained.
- **If Lightning CSS rewrites or drops a selector:** check `build/_app/immutable/assets/*.css` or the inlined `<style>` in `build/index.html`. The usual culprits are `:only-child` after a pseudo-element, or the `:active-view-transition-type()` list. If it does, fall back to one selector per type and report it in the ledger.
- **If the existing `work-pages` "reduced motion" CSS regex** (`/prefers-reduced-motion: reduce[\s\S]*::view-transition-group\(\*\)[\s\S]*animation: (none|…)`) fails because the CSSOM serialises `!important`: extend its alternation with `none !important`. Don't drop the check.

- [ ] **Step 6: Run the tests to check they pass.**

Run: `bunx vitest run tests/unit/css.test.ts && bunx playwright test transitions work-pages motion`

Expected: PASS.

- [ ] **Step 7: Visual check (no new tests).** Write a throwaway Playwright script in the gitignored `morph/` folder. It uses `channel: 'chromium'` and a 1280×800 viewport, clicks home → `/work/myne`, and screenshots at about 120 ms, 300 ms, 500 ms and 700 ms. Use `page.screenshot` in a timed loop after `click()`, starting the timer from `pagereveal` via an init script. Look at the frames:
  - home tilts back and fades, the unclicked sheets with it;
  - the drawing is larger and glowing mid-flight;
  - the header text appears before the gallery.

  Then do the same at 390×844. Adjust values only if a frame is clearly wrong (for example, the fold's `transform-origin` throws content off-screen). Re-run Step 6 after any change.

- [ ] **Step 8: Run the leak check (its own step).** Both greps must print `0`.

- [ ] **Step 9: Commit.**

```bash
git add src/app.css tests/unit/css.test.ts tests/e2e/transitions.spec.ts tests/e2e/work-pages.spec.ts
git commit -m "feat: cinematic transitions: home folds as the drawing leads, two-beat arrival, sideways prev/next, 800 ms ceiling" -m "<trailer>"
```

---

### Task 4: Full suite, budgets, GIFs and the visual gate

**Files:** none committed. Recording scripts and outputs go in the gitignored `morph/` folder and the scratchpad.

- [ ] **Step 1: Run the full suite.**

Run: `bun run test && bun run check`

Expected:
- every test passes;
- the `/work` JS budget is still under 4,096 B. Record the new byte count in the ledger: print it with a one-off `gzip -c` over the inline scripts plus the two client scripts, as `budget.test.ts` does.

- [ ] **Step 2: Record the videos.** Use Playwright `recordVideo` (`channel: 'chromium'`, viewport and video size 1280×800) against `bunx vite preview --port 4173`, one context per clip:
  - `forward.webm`: home, scrolled so `#myne` is centred; hold 600 ms, click "View project", hold 1,200 ms.
  - `back.webm`: same start → project, wait 1,200 ms, `page.goBack()`, hold 1,200 ms. Trim to start at the Back.
  - `next.webm`: `/work/myne` at the top of the page (so the sliding header is in frame); hold 600 ms, trigger Next with `page.getByRole('link', {name: /^Next:/}).evaluate(a => a.click())` (a real click event, so the hand-off fires, without scrolling to the link), hold 1,200 ms.

  If CDP `Animation.setPlaybackRate` (0.25) survives the cross-document navigation, also record slow-motion copies (`*-slow.webm`). If it doesn't, skip them and note it.

- [ ] **Step 3: Convert to GIF.**

```bash
ffmpeg -y -i in.webm -vf "fps=30,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" out.gif
```

- [ ] **Step 4: Send the GIFs and open them in Chrome.** Send the GIFs with SendUserFile. Open each in a new Chrome tab (`file://…`). **Stop and wait for the user's OK.** Treat any feedback as a fix task, then re-record.

---

### Task 5: Ship and verify (after the user's OK only)

- [ ] **Step 1: Fast-forward main.**

```bash
git checkout main && git merge --ff-only feat/transitions
```

- [ ] **Step 2: Push** (its own step, never chained with a commit). Run `git push origin main`. Pushing deploys through Cloudflare Workers Builds.

- [ ] **Step 3: Verify the live site.**
  - Poll `https://yashnaj.dev/work/myne` until its HTML contains `data-vt-page="case"`.
  - Check `curl -sI https://yashnaj.dev/` returns 200.
  - Run the transitions e2e spec once against production. The config hard-codes `baseURL`, so use a throwaway config in `morph/` that sets `baseURL: 'https://yashnaj.dev'` and has no `webServer`.

- [ ] **Step 4: Run Lighthouse.** Mobile, three runs each on `/`, `/work/chauffeur`, `/work/myne`, `/work/mri-viewer` and `/work/hard-pills`:

```bash
bunx lighthouse <url> --quiet --chrome-flags="--headless=new" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=<scratch>/lh-<page>-<n>.json
```

Report the performance score for each run, and the minimum of the other categories. The targets are home 100 and `/work/*` ≥ 95.
