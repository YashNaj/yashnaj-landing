# Story Drawings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the four home-page project drawings into story drawings:
- **chauffeur, mri-viewer, myne:** real 3D wireframes, rendered in their final 3/4 view at build time. On home they turn briefly into that view as they draw in.
- **hard-pills:** stays flat.
- **All four:** play a short looping story of their product.

**Architecture:**
- **`src/lib/drawings/project.ts` (pure TypeScript):** orthographic projection and shape helpers.
- **`Wire.svelte` and `Plane.svelte`:** render a model's 3D edges and its mapped 2D planes in the final pose, during SSR.
- **`src/lib/client/models.js` (home only):** re-projects edges, planes and leader anchors during a short eased turn that starts on the engine's `draw:start` event. It also swings Myne's door in time with its CSS loop.
- **Story loops:** CSS keyframes on one `--loop` clock per drawing, gated by the existing `data-live`.
- **`enhance.js`:** draws story figures at double speed and fires `draw:start`.

**Tech Stack:**
- SvelteKit (adapter-static) and Svelte 5 runes
- Tailwind v4 plus `src/app.css`
- Vanilla client scripts imported with `?url`
- Vitest and Playwright (Chromium)

**Spec:** `docs/superpowers/specs/2026-10-13-story-drawings-design.md`

**Reference implementation:** branch `spike/chauffeur-story` (throwaway). Its `src/lib/drawings/PhoneNoEffect.svelte`, `src/app.css` "Story drawings" block and `enhance.js` `model()` hold the approved chauffeur look. Copy values from it, not code structure.

## Global Constraints

- **Confidentiality:** never name the MRI client anywhere (code, docs, commit messages, chat). The forbidden terms are in the gitignored `.confidential-terms`.
- **Leak check:** before **every** commit, run it as its own step, never chained with a commit or push. Both must print 0:
  - `git diff --cached | grep -ciEf .confidential-terms`
  - `git diff --cached --name-only | grep -ciEf .confidential-terms`
- **Commit trailer:**
  - `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  - `Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub`
- **Commands:**
  - `bun run test` runs build, vitest and playwright.
  - Single e2e file: `bunx playwright test tests/e2e/<file>`.
  - Type check: `bun run check`.
- **Budgets (gzip):**
  - `enhance.js` < 3,584 B
  - `models.js` < 1,536 B
  - each `/work/*` page's JS < 4,096 B (they must not load `models.js`)
  - home first-load JS < 30 KB
- **Lighthouse after deploy:** home 100 in all four categories with CLS 0; `/work/*` ≥ 95.
- **Approved chauffeur values (spec):**
  - depth 16 (`HALF = 8`)
  - turn yaw −12°→−30°, pitch 5°→10°
  - back outline full ink, width 1.35
  - band every second outline point
  - side buttons 6 deep
  - camera bump on the back
  - occluding `.face-fill`
  - construction axes on the mid plane (z = 0)
  - loop 4.2 s
  - battery with nub and fill; signal bars full weight
- **Speed:** story figures draw with factor `k = 0.5`. Ink starts at width 2.8 and settles over 400 ms.
- **Fallbacks:**
  - Reduced motion, no JS, `html.restored`, `/work/*` and print all show the final pose drawn.
  - Reduced motion runs no animations at all (the existing `motion.spec.ts` must stay green).
- **Visual gate:** one GIF per drawing is sent to the user before merge.

## Review Focus

1. **Morph:** the home ↔ `/work/<slug>` morph of a 3D drawing must not jump. SSR output must be identical on both pages.
2. **Mid-turn:** a drawing scrolled away mid-turn, or clicked through mid-turn, still ends in the final pose. The turn must not restart on revisit.
3. **Slow `models.js`:** if `models.js` arrives after `draw:start`, the drawing stays at the SSR final pose (no jump back to FROM). [Task 3 test]
4. **Off-screen loops:** loops never run while off screen, and Myne's door rAF stops when `data-live` drops. [Task 6 test]
5. **Reduced motion:** reduced motion runs zero animations on every page, including the new loops and the door. [Task 8, motion.spec]

---

## File map

| File | Status | Contents | Task |
|---|---|---|---|
| `src/lib/drawings/project.ts` | create | `Vec3`, `Pose`, `pose()`, `edgePath()`, `matrixAttr()`, `weigh()`, shapes | 1 |
| `src/lib/drawings/Wire.svelte` | create | the 3D edges group | 2 |
| `src/lib/drawings/Plane.svelte` | create | a mapped 2D plane group | 2 |
| `src/lib/drawings/PhoneNoEffect.svelte` | rewrite | chauffeur model, planes, story parts | 2, 4 |
| `src/lib/drawings/ScanSlices.svelte` | rewrite | mri model and story | 5 |
| `src/lib/drawings/PassportVault.svelte` | rewrite | myne model and story | 6 |
| `src/lib/drawings/ComicPanels.svelte` | edit | story classes only | 7 |
| `src/lib/client/models.js` | create | turn and hinge runtime | 3, 6 |
| `src/lib/client/enhance.js` | edit | `k`, `draw:start` | 3 |
| `src/routes/+page.svelte` | edit | loads `models.js` before `enhance.js` | 3 |
| `vite.config.ts` | edit | minify regex includes `models` | 3 |
| `src/app.css` | edit | story base rules and per-drawing loops | 3–7 |
| `tests/unit/project.test.ts` | create | | 1 |
| `tests/e2e/story.spec.ts` | create | | 2–7 |
| `tests/unit/budget.test.ts` | edit | | 3 |
| `tests/e2e/drawings.spec.ts` | edit | layer and parallax tests move to hard-pills; 3D slugs assert a wire instead | 2 |

---

### Task 1: Projection math (`project.ts`)

**Files:** create `src/lib/drawings/project.ts` and `tests/unit/project.test.ts`.

**Interfaces, produces:**

```ts
export type Vec3 = [number, number, number];
export type Matrix = [number, number, number, number, number, number];
export interface Pose { point(v: Vec3): Vec3; plane(o: Vec3, u?: Vec3, v?: Vec3): Matrix }
export interface Edge { pts: Vec3[]; cls?: string; w?: number; part?: string }
export const pose: (yawDeg: number, pitchDeg: number, centre: [number, number]) => Pose;
export const edgePath: (p: Pose, pts: Vec3[]) => string; // "M x y L x y …", 1 decimal
export const matrixAttr: (m: Matrix) => string; // "matrix(a b c d e f)", 4 decimals
export const weigh: (p: Pose, edges: Edge[], half: number) => Edge[]; // fills w: dim→1.05, else 1.3, ±0.45 by mean depth/half; keeps an explicit w
export const roundedRect: (x: number, y: number, w: number, h: number, r: number, z: number, seg?: number) => Vec3[]; // closed
export const ring: (cx: number, cy: number, r: number, z: number, n?: number) => Vec3[]; // closed, in a z-plane
export const rectXZ: (x0: number, x1: number, y: number, z0: number, z1: number) => Vec3[]; // closed, horizontal
export const box: (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => Vec3[][]; // 12 edges
export const band: (a: Vec3[], b: Vec3[], every?: number) => Vec3[][]; // a[i]→b[i] connectors
```

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/project.test.ts
import { describe, expect, it } from 'vitest';
import { band, box, edgePath, matrixAttr, pose, ring, roundedRect, weigh, type Vec3 } from '../../src/lib/drawings/project';

describe('pose', () => {
	it('identity pose maps points to themselves', () => {
		const p = pose(0, 0, [200, 150]);
		expect(p.point([10, 20, 5]).slice(0, 2)).toEqual([10, 20]);
	});
	it('90° yaw turns +z into +x', () => {
		const [x, y] = pose(90, 0, [0, 0]).point([0, 0, 10]);
		expect(x).toBeCloseTo(10);
		expect(y).toBeCloseTo(0);
	});
	it('plane() agrees with point() for points on that plane', () => {
		const p = pose(-30, 10, [200, 150]);
		const [a, b, c, d, e, f] = p.plane([0, 0, 8]);
		for (const [x, y] of [[130, 20], [270, 280], [200, 184]]) {
			const q = p.point([x, y, 8]);
			expect(a * x + c * y + e).toBeCloseTo(q[0], 6);
			expect(b * x + d * y + f).toBeCloseTo(q[1], 6);
		}
	});
	it('plane() handles a horizontal plane (u = x, v = z)', () => {
		const p = pose(-25, 20, [200, 150]);
		const m = p.plane([0, 196, 0], [1, 0, 0], [0, 0, 1]);
		const q = p.point([60, 196, -30]);
		expect(m[0] * 60 + m[2] * -30 + m[4]).toBeCloseTo(q[0], 6);
		expect(m[1] * 60 + m[3] * -30 + m[5]).toBeCloseTo(q[1], 6);
	});
});

describe('shapes', () => {
	it('roundedRect and ring are closed', () => {
		for (const s of [roundedRect(130, 20, 140, 260, 24, 8), ring(232, 58, 13, -8)]) expect(s.at(-1)).toEqual(s[0]);
	});
	it('box has 12 edges and band connects every n-th point', () => {
		expect(box(0, 1, 0, 1, 0, 1)).toHaveLength(12);
		const a: Vec3[] = [[0, 0, 1], [1, 0, 1], [2, 0, 1], [3, 0, 1]];
		const b = a.map(([x, y]) => [x, y, -1] as Vec3);
		expect(band(a, b, 2)).toEqual([[[0, 0, 1], [0, 0, -1]], [[2, 0, 1], [2, 0, -1]]]);
	});
});

describe('output', () => {
	it('edgePath and matrixAttr are stable strings', () => {
		const p = pose(0, 0, [0, 0]);
		expect(edgePath(p, [[1, 2, 0], [3.14159, 4, 0]])).toBe('M1.0 2.0L3.1 4.0');
		expect(matrixAttr([1, 0, 0, 1, 2.123456, 3])).toBe('matrix(1 0 0 1 2.1235 3)');
	});
	it('weigh: nearer edges are heavier, explicit widths are kept', () => {
		const p = pose(0, 0, [0, 0]);
		const [near, far, fixed] = weigh(p, [{ pts: [[0, 0, 8], [1, 0, 8]] }, { pts: [[0, 0, -8], [1, 0, -8]] }, { pts: [[0, 0, -8]], w: 1.35 }], 8);
		expect(near.w).toBeGreaterThan(far.w!);
		expect(fixed.w).toBe(1.35);
	});
});
```

- [ ] **Step 2: Run the tests and see them fail.** `bunx vitest run tests/unit/project.test.ts`. Expected: FAIL, cannot resolve `project`.

- [ ] **Step 3: Implement.**

```ts
// src/lib/drawings/project.ts
// Orthographic 3D for the story drawings: rendered at build time in the final pose; models.js re-projects during the turn.
export type Vec3 = [number, number, number];
export type Matrix = [number, number, number, number, number, number];
export interface Pose { point(v: Vec3): Vec3; plane(o: Vec3, u?: Vec3, v?: Vec3): Matrix }
export interface Edge { pts: Vec3[]; cls?: string; w?: number; part?: string }

const R = Math.PI / 180;
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Yaw about the vertical axis, then pitch about the horizontal, around `centre`; returns [x, y, depth] (depth > 0 is nearer). */
export const pose = (yawDeg: number, pitchDeg: number, [cx, cy]: [number, number]): Pose => {
	const cyw = Math.cos(yawDeg * R), syw = Math.sin(yawDeg * R), cp = Math.cos(pitchDeg * R), sp = Math.sin(pitchDeg * R);
	const point = ([x, y, z]: Vec3): Vec3 => {
		const X = x - cx, Y = y - cy;
		const X1 = X * cyw + z * syw, Z1 = -X * syw + z * cyw;
		return [cx + X1, cy + Y * cp - Z1 * sp, Y * sp + Z1 * cp];
	};
	// local (s, t) on the plane through o spanned by u, v → view, as one affine matrix (exact for orthographic)
	const plane = (o: Vec3, u: Vec3 = [1, 0, 0], v: Vec3 = [0, 1, 0]): Matrix => {
		const p0 = point(o), pu = point(add(o, u)), pv = point(add(o, v));
		return [pu[0] - p0[0], pu[1] - p0[1], pv[0] - p0[0], pv[1] - p0[1], p0[0], p0[1]];
	};
	return { point, plane };
};

export const edgePath = (p: Pose, pts: Vec3[]) => 'M' + pts.map((v) => { const q = p.point(v); return `${q[0].toFixed(1)} ${q[1].toFixed(1)}`; }).join('L');
export const matrixAttr = (m: Matrix) => `matrix(${m.map((n) => +n.toFixed(4)).join(' ')})`;

/** Depth-weighted stroke widths: nearer edges read heavier; an explicit w wins. */
export const weigh = (p: Pose, edges: Edge[], half: number): Edge[] =>
	edges.map((e) => {
		if (e.w !== undefined) return e;
		const z = e.pts.reduce((s, v) => s + p.point(v)[2], 0) / e.pts.length;
		const base = e.cls?.includes('dim') ? 1.05 : 1.3;
		return { ...e, w: +(base + 0.45 * clamp(z / half, -1, 1)).toFixed(2) };
	});

export const roundedRect = (x: number, y: number, w: number, h: number, r: number, z: number, seg = 6): Vec3[] => {
	const pts: Vec3[] = [];
	const corners: [number, number, number][] = [[x + r, y + r, 180], [x + w - r, y + r, 270], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90]];
	for (const [cx, cy, a0] of corners)
		for (let i = 0; i <= seg; i++) { const a = (a0 + (i * 90) / seg) * R; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z]); }
	return [...pts, pts[0]];
};
export const ring = (cx: number, cy: number, r: number, z: number, n = 16): Vec3[] =>
	Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos((i * 2 * Math.PI) / n), cy + r * Math.sin((i * 2 * Math.PI) / n), z] as Vec3).map((v, i, a) => (i === n ? a[0] : v));
export const rectXZ = (x0: number, x1: number, y: number, z0: number, z1: number): Vec3[] => [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0, y, z0]];
export const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Vec3[][] => {
	const c = (i: number): Vec3 => [i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0];
	const e: Vec3[][] = [];
	for (let i = 0; i < 8; i++) for (const b of [1, 2, 4]) if (!(i & b)) e.push([c(i), c(i | b)]);
	return e;
};
export const band = (a: Vec3[], b: Vec3[], every = 2): Vec3[][] => a.flatMap((v, i) => (i % every === 0 && i < b.length ? [[v, b[i]]] : []));
```

- [ ] **Step 4: Run the tests and see them pass.** `bunx vitest run tests/unit/project.test.ts`. Expected: PASS, 8 tests. Then run `bun run check`. Expected: 0 errors.
- [ ] **Step 5: Leak check, as its own step.** `git add src/lib/drawings/project.ts tests/unit/project.test.ts`, then run both greps. Expected: `0` and `0`.
- [ ] **Step 6: Commit.** `feat: orthographic projection and shape helpers for 3D story drawings`, with the trailer.

---

### Task 2: chauffeur in 3D at build time (`Wire`, `Plane`, `PhoneNoEffect`)

**Files:**
- Create: `src/lib/drawings/Wire.svelte`, `src/lib/drawings/Plane.svelte`, `tests/e2e/story.spec.ts`
- Rewrite: `src/lib/drawings/PhoneNoEffect.svelte`
- Edit: `src/app.css`, `tests/e2e/drawings.spec.ts`

**Interfaces:**
- Consumes everything from Task 1.
- Produces the `svg.story[data-model]` contract, which `models.js` reads:
  - `data-centre="x,y"`, `data-from="yaw,pitch"`, `data-to="yaw,pitch"` on the root `<svg>`.
  - `<g class="wire">` holding `<path pathLength="1" data-pts="[[x,y,z],…]" data-part?>`.
  - `<g data-plane="ox,oy,oz,ux,uy,uz,vx,vy,vz" data-part? transform="matrix(…)">` for each plane.
  - `data-anchor="x,y,z"` on any leader `polyline` or `path` whose first point sits in the model.

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/e2e/story.spec.ts
import { expect, test } from '@playwright/test';

const models = ['chauffeur'] as const; // Tasks 5–6 append 'mri-viewer', 'myne'
const faceMatrix = (page: import('@playwright/test').Page, sel: string) =>
	page.locator(sel).first().getAttribute('transform');

test.describe('3D drawings render their final pose without JavaScript', () => {
	test.use({ javaScriptEnabled: false });
	for (const slug of models) {
		test(`${slug}: wire, mapped planes and an occluding face`, async ({ page }) => {
			await page.goto('/');
			const svg = page.locator(`#${slug} svg[data-model]`);
			expect(await svg.locator('.wire path[data-pts]').count()).toBeGreaterThanOrEqual(20);
			expect(await svg.locator('[data-plane]').count()).toBeGreaterThanOrEqual(2);
			expect(await faceMatrix(page, `#${slug} [data-plane]`)).not.toMatch(/^matrix\(1 0 0 1 0 0\)$/);
			expect(await svg.locator('.face-fill').count()).toBeGreaterThanOrEqual(1);
		});
		test(`${slug}: the project page shows the identical final pose (morph matches)`, async ({ page }) => {
			await page.goto('/');
			const home = await page.locator(`#${slug} svg[data-model]`).evaluate((s) => [...s.querySelectorAll('[data-pts]')].map((p) => p.getAttribute('d')).join('|') + [...s.querySelectorAll('[data-plane]')].map((g) => g.getAttribute('transform')).join('|'));
			await page.goto(`/work/${slug}`);
			const work = await page.locator('header svg[data-model]').evaluate((s) => [...s.querySelectorAll('[data-pts]')].map((p) => p.getAttribute('d')).join('|') + [...s.querySelectorAll('[data-plane]')].map((g) => g.getAttribute('transform')).join('|'));
			expect(work).toBe(home);
		});
	}
	test('construction axes turn with the phone (mid plane)', async ({ page }) => {
		await page.goto('/');
		const axes = page.locator('#chauffeur [data-plane] .c').first();
		expect(await axes.evaluate((el) => el.closest('[data-plane]')!.getAttribute('data-plane'))).toBe('0,0,0,1,0,0,0,1,0');
	});
	test('leader starts at the projected button', async ({ page }) => {
		await page.goto('/');
		const pts = await page.locator('#chauffeur polyline[data-anchor]').getAttribute('points');
		expect(pts!.split(' ')[0]).not.toBe('214,177');
	});
});
```

In `tests/e2e/drawings.spec.ts`, the per-slug "layered and intricate" test becomes structure-aware:

```ts
	test(`${slug} drawing is layered and intricate`, async ({ page }) => {
		await page.goto('/');
		const fig = page.locator(`#${slug} figure.drawing`);
		const is3d = (await fig.locator('svg[data-model]').count()) > 0;
		if (is3d) expect(await fig.locator('.wire path').count()).toBeGreaterThanOrEqual(20);
		else expect(await fig.locator('svg > g.layer').count()).toBeGreaterThanOrEqual(4);
		expect(await fig.locator('.stroke, .after, .c, .type').count()).toBeGreaterThanOrEqual(30);
		expect(await fig.locator('.live, .wobble, .bob, .march, .vp, .knob, [class*="st-"]').count()).toBeGreaterThanOrEqual(1);
	});
```

In the "fine pointer shifts depth layers" test, change `#myne` to `#hard-pills` (twice). That drawing stays flat with depth layers.

- [ ] **Step 2: Run the tests and see them fail.** `bunx playwright test tests/e2e/story.spec.ts`. Expected: FAIL, `svg[data-model]` not found.

- [ ] **Step 3: Write `Wire.svelte` and `Plane.svelte`.**

```svelte
<!-- src/lib/drawings/Wire.svelte -->
<script lang="ts">
	import { edgePath, type Edge, type Pose } from './project';
	let { pose, edges }: { pose: Pose; edges: Edge[] } = $props();
</script>

<g class="wire">
	{#each edges as e}
		<path class={e.cls ?? 'stroke'} pathLength="1" d={edgePath(pose, e.pts)} data-pts={JSON.stringify(e.pts)} data-part={e.part} style:stroke-width={e.w} />
	{/each}
</g>
```

```svelte
<!-- src/lib/drawings/Plane.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { matrixAttr, type Pose, type Vec3 } from './project';
	let { pose, o, u = [1, 0, 0], v = [0, 1, 0], part, class: klass = '', children }: { pose: Pose; o: Vec3; u?: Vec3; v?: Vec3; part?: string; class?: string; children: Snippet } = $props();
</script>

<g class={klass} transform={matrixAttr(pose.plane(o, u, v))} data-plane={[...o, ...u, ...v].join(',')} data-part={part}>
	{@render children()}
</g>
```

- [ ] **Step 4: Rewrite `PhoneNoEffect.svelte` with the approved model.**
  - The `<script>` builds the model:
    - `const HALF = 8`, `const FROM = [-12, 5]`, `const TO = [-30, 10]`, `const C: [number, number] = [200, 150]`, `const final = pose(TO[0], TO[1], C)`.
    - `const front = roundedRect(130, 20, 140, 260, 24, HALF)`.
    - `edges = weigh(final, [ { pts: roundedRect(130, 20, 140, 260, 24, -HALF), w: 1.35 }, ...band(front.slice(0, -1), roundedRect(130, 20, 140, 260, 24, -HALF), 2).map((pts) => ({ pts, cls: 'stroke dim' })), ...box(127, 130, 70, 88, -3, 3), ...box(127, 130, 96, 122, -3, 3), ...box(270, 273, 92, 128, -3, 3) (as edges), { pts: ring(232, 58, 13, -HALF - 2), cls: 'stroke dim' }, { pts: ring(232, 58, 7, -HALF - 2), cls: 'stroke dim' } ], HALF)`.
    - `const anchor = (x: number, y: number) => final.point([x, y, HALF])`.
  - Markup order:
    1. `<svg class="story" viewBox="0 0 400 300" aria-hidden="true" data-model data-centre="200,150" data-from="-12,5" data-to="-30,10">`
    2. `<Plane pose={final} o={[0, 0, 0]}>` holding the 4 `.c` construction elements
    3. `<Wire pose={final} {edges} />`
    4. `<Plane pose={final} o={[0, 0, HALF]} class="face">` holding the `rect.face-fill`, then every face element from the spike's `.face` group: battery with nub and fill, full-weight signal bars, `.btn`, story parts `.st-a`, `.st-b`, `.st-tick`, the dimension arrows and H/W texts, `.tapdot`, the sig circles, the ripples and the cursor
    5. A flat `<g>` with `<polyline class="stroke sig leader" data-anchor="214,177,8" points="{ax},{ay} 276,117 298,117">`, `<path class="pulse live leader-pulse" data-anchor="214,177,8" d="M{ax} {ay} L276 117 L298 117">`, the `.stamp`, `.st-zero` and `.st-one`
  - Leave out the side-button lines at x = 128 and x = 272; they're boxes now.

- [ ] **Step 5: Add the base story CSS.** In `src/app.css`, after the `/* ---------- Self-drawing illustrations` block's live loop keyframes, add:

```css
/* ---------- Story drawings (svg.story) ---------- */
.drawing .face-fill { fill: var(--color-ink); stroke: none; }
.drawing .battery-fill { fill: var(--color-paper); }
```

- [ ] **Step 6: Run the tests and see them pass.** `bunx playwright test tests/e2e/story.spec.ts tests/e2e/drawings.spec.ts tests/e2e/work.spec.ts`. Expected: PASS.
  - **Visual check:** screenshot `#chauffeur figure.drawing` with reduced motion at 1280×900. Compare by eye with `chauffeur-3d-v6.gif`'s last frame: the same 3/4 view, the axes turned, and the leader starting on the button.
- [ ] **Step 7:** `bun run check`, expecting 0 errors. Run the leak check as its own step, then commit `feat: chauffeur phone as a 3D wireframe rendered in its final pose at build time`.

---

### Task 3: The turn (`models.js`), speed and ink settle

**Files:**
- Create: `src/lib/client/models.js`
- Edit:
  - `src/lib/client/enhance.js` (`choreograph(fig, start, k)`, `draw:start`)
  - `src/routes/+page.svelte` (load `models.js` before `enhance.js`)
  - `vite.config.ts` (minify regex `(enhance|carousel|models)`)
  - `src/app.css`, `tests/e2e/story.spec.ts`, `tests/unit/budget.test.ts`

**Interfaces:**
- Consumes the Task 2 SVG contract.
- Produces:
  - `enhance.js` dispatches `new CustomEvent('draw:start', { detail: { end } })` on the figure when a timed draw begins. It never fires for reduced motion, `restored` or `data-drawn`.
  - `models.js` turns each model `FROM → TO` over `min(end, 1800)` ms with an ease-out cubic, then leaves the exact SSR transform strings in place.

- [ ] **Step 1: Write the failing tests.** Append to `tests/e2e/story.spec.ts`:

```ts
const nums = (m: string | null) => m!.match(/-?[\d.]+/g)!.map(Number);
test.describe('the turn', () => {
	test.use({ viewport: { width: 1280, height: 900 } });
	test('a 3D drawing turns into its final pose as it draws, then holds the SSR pose', async ({ page }) => {
		await page.goto('/');
		const face = page.locator('#chauffeur [data-plane].face');
		const ssr = await page.evaluate(async () => (await (await fetch('/')).text()).match(/class="face"[^>]*transform="([^"]+)"|transform="([^"]+)"[^>]*class="face"/)!.slice(1).find(Boolean));
		const before = await face.getAttribute('transform');
		expect(nums(before)[0]).not.toBeCloseTo(nums(ssr!)[0], 2); // sits at FROM until it draws
		await page.locator('#chauffeur').scrollIntoViewIfNeeded();
		await expect.poll(async () => nums(await face.getAttribute('transform')).map((n, i) => Math.abs(n - nums(ssr!)[i])).every((d) => d < 0.01), { timeout: 4000 }).toBe(true);
	});
	test('reduced motion never turns', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		const face = page.locator('#chauffeur [data-plane].face');
		const t0 = await face.getAttribute('transform');
		await page.locator('#chauffeur').scrollIntoViewIfNeeded();
		await page.waitForTimeout(1500);
		expect(await face.getAttribute('transform')).toBe(t0);
	});
	test('if models.js arrives after the draw started, the SSR pose stays', async ({ page }) => {
		await page.route('**/models*.js', async (r) => { await new Promise((ok) => setTimeout(ok, 2500)); await r.continue(); });
		await page.goto('/');
		const face = page.locator('#chauffeur [data-plane].face');
		const ssr = await face.getAttribute('transform');
		await page.locator('#chauffeur').scrollIntoViewIfNeeded();
		await page.waitForTimeout(3500);
		expect(await face.getAttribute('transform')).toBe(ssr);
	});
	test('story figures draw at double speed (finished by 1.6 s)', async ({ page }) => {
		await page.goto('/');
		await page.locator('#chauffeur').scrollIntoViewIfNeeded();
		await expect(page.locator('#chauffeur figure.drawing')).toHaveAttribute('data-drawn', '');
		const end = await page.locator('#chauffeur .stroke').evaluateAll((els) => Math.max(...els.map((e) => parseFloat((e as HTMLElement).style.getPropertyValue('--t')) + parseFloat((e as HTMLElement).style.getPropertyValue('--d') || '0'))));
		expect(end).toBeLessThanOrEqual(1600);
	});
	test('project pages do not load models.js', async ({ page }) => {
		const urls: string[] = [];
		page.on('request', (r) => urls.push(r.url()));
		await page.goto('/work/chauffeur');
		expect(urls.some((u) => /models[.-][\w-]+\.js/.test(u))).toBe(false);
	});
});
```

Append to `tests/unit/budget.test.ts`:

```ts
describe('3D model runtime budget', () => {
	it('models.js stays under 1.5 KB gzipped and loads on home only', () => {
		const dir = 'build/_app/immutable/assets';
		const file = readdirSync(dir).find((f) => /^models[.-][\w-]+\.js$/.test(f))!;
		expect(gzipSync(readFileSync(join(dir, file))).length).toBeLessThan(1536);
		expect(readFileSync('build/index.html', 'utf8')).toMatch(/models[.-][\w-]+\.js/);
		expect(readFileSync('build/work/chauffeur.html', 'utf8')).not.toMatch(/models[.-][\w-]+\.js/);
	});
});
```

Change the import at the top of that file to `import { existsSync, readdirSync, readFileSync } from 'node:fs';`.

- [ ] **Step 2: Run the tests and see them fail.** Run `bunx playwright test tests/e2e/story.spec.ts -g "turn|double speed|models.js"` and `bunx vitest run tests/unit/budget.test.ts`. Expected: FAIL. Nothing turns, the `--t + --d` end is around 3 s, and there's no models file.

- [ ] **Step 3: Create `src/lib/client/models.js`.**

```js
// @ts-nocheck — plain browser script (home only): turns 3D story drawings into their build-time final pose.
(() => {
	const R = Math.PI / 180;
	const html = document.documentElement;
	if (matchMedia('(prefers-reduced-motion: reduce)').matches || html.classList.contains('restored')) return;
	const nums = (s) => s.split(',').map(Number);
	for (const svg of document.querySelectorAll('svg[data-model]')) {
		const fig = svg.closest('[data-draw]');
		if (!fig || fig.hasAttribute('data-drawn')) continue;
		const [cx, cy] = nums(svg.dataset.centre);
		const from = nums(svg.dataset.from), to = nums(svg.dataset.to);
		const edges = [...svg.querySelectorAll('[data-pts]')].map((el) => [el, JSON.parse(el.dataset.pts)]);
		const planes = [...svg.querySelectorAll('[data-plane]')].map((el) => [el, nums(el.dataset.plane), el.getAttribute('transform')]);
		const anchors = [...svg.querySelectorAll('[data-anchor]')].map((el) => [el, nums(el.dataset.anchor)]);
		const ssr = [...edges.map(([el]) => [el, 'd', el.getAttribute('d')]), ...planes.map(([el, , t]) => [el, 'transform', t]), ...anchors.map(([el]) => [el, el.tagName === 'polyline' ? 'points' : 'd', el.getAttribute(el.tagName === 'polyline' ? 'points' : 'd')])];
		const set = (yaw, pitch) => {
			const a = Math.cos(yaw * R), b = Math.sin(yaw * R), c = Math.cos(pitch * R), d = Math.sin(pitch * R);
			const P = ([x, y, z]) => { const X = x - cx, Y = y - cy, Z1 = -X * b + z * a; return [cx + X * a + z * b, cy + Y * c - Z1 * d]; };
			const f = (q) => q.map((n) => n.toFixed(1));
			for (const [el, pts] of edges) el.setAttribute('d', 'M' + pts.map((p) => f(P(p)).join(' ')).join('L'));
			for (const [el, [ox, oy, oz, ux, uy, uz, vx, vy, vz]] of planes) {
				const p0 = P([ox, oy, oz]), pu = P([ox + ux, oy + uy, oz + uz]), pv = P([ox + vx, oy + vy, oz + vz]);
				el.setAttribute('transform', `matrix(${pu[0] - p0[0]} ${pu[1] - p0[1]} ${pv[0] - p0[0]} ${pv[1] - p0[1]} ${p0[0]} ${p0[1]})`);
			}
			for (const [el, p] of anchors) {
				const q = f(P(p));
				if (el.tagName === 'polyline') el.setAttribute('points', el.getAttribute('points').replace(/^\S+/, q.join(',')));
				else el.setAttribute('d', el.getAttribute('d').replace(/^M\s*[-\d.]+[ ,]+[-\d.]+/, 'M' + q.join(' ')));
			}
		};
		set(...from); // hidden until drawn, so the jump from the SSR pose is never seen
		fig.addEventListener('draw:start', (e) => {
			const ms = Math.min(e.detail.end, 1800), t0 = performance.now();
			const tick = (now) => {
				const p = Math.min(1, (now - t0) / ms), k = 1 - (1 - p) ** 3;
				if (p < 1) { set(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k); requestAnimationFrame(tick); }
				else for (const [el, attr, v] of ssr) el.setAttribute(attr, v); // land exactly on the build-time pose
			};
			requestAnimationFrame(tick);
		}, { once: true });
		// a draw that started before this script ran keeps the SSR pose
		if (fig.hasAttribute('data-drawn')) for (const [el, attr, v] of ssr) el.setAttribute(attr, v);
	}
})();
```

  - Ruling to carry: the "arrives late" guard. When `models.js` runs after `data-drawn` was set, the loop skips that figure (`continue` on `data-drawn` above). It never calls `set(from)`, so the SSR pose stays. The last line is a belt-and-braces guard and may be dropped if it proves unreachable.

- [ ] **Step 4: Engine changes, in `src/lib/client/enhance.js`.**
  - Change `const choreograph = (fig) =>` to `(fig, k = 1) =>`.
  - Inside the loop, use `clamp(el.getTotalLength() * 2.4 * k, 280 * k, 1400 * k)`, `t + 700 * k` and `t += 90 * k`.
  - In `draw()`:
    - replace `const end = choreograph(fig);` with `const end = choreograph(fig, fig.querySelector('svg.story') ? 0.5 : 1);`
    - after it, add `fig.dispatchEvent(new CustomEvent('draw:start', { detail: { end } }));`

- [ ] **Step 5: Ink settle, in `src/app.css`'s story block.**

```css
/* ink lands heavy and settles to its weight */
html.js:not(.restored) [data-draw]:not([data-drawn]) svg.story .stroke { stroke-width: 2.8; }
html.js [data-draw] svg.story .stroke { transition: stroke-dashoffset var(--d, 900ms) var(--ease-draw) var(--t, 0ms), stroke-width 400ms var(--ease-out) calc(var(--t, 0ms) + var(--d, 900ms) * 0.7); }
```

  Wire edges carry an inline `stroke-width` (Task 2). An inline style beats the 2.8 start rule, which is acceptable: the body edges don't "land heavy". This ruling is pre-made.

- [ ] **Step 6: Loading.**
  - In `src/routes/+page.svelte`, add `import modelsUrl from '$lib/client/models.js?url';`. The head becomes `<script src={modelsUrl} defer></script><script src={enhanceUrl} defer></script>`, with `models` first so its listener exists before any draw.
  - In `vite.config.ts`, change the regex to `/\/(enhance|carousel|models)\.[\w-]+\.js$/`.

- [ ] **Step 7: Run the tests and see them pass.** `bunx playwright test tests/e2e/story.spec.ts tests/e2e/drawings.spec.ts tests/e2e/work.spec.ts tests/e2e/motion.spec.ts && bunx vitest run`. Expected: PASS. Existing timed-draw tests still pass: `drawings.spec` asserts relative timing, and `work.spec` polls.
- [ ] **Step 8:** `bun run check`, expecting 0. Run the leak check as its own step, then commit `feat: 3D drawings turn into their final pose as they draw; story drawings draw at double speed`.

---

### Task 4: chauffeur story loop

**Files:** edit `src/app.css` and `tests/e2e/story.spec.ts`.

**Interfaces:**
- Consumes the chauffeur classes from Task 2: `.cursor`, `.btn`, `.tapdot`, `.ripple`, `.st-a`, `.st-b`, `.st-tick`, `.leader-pulse`, `.stamp`, `.st-one`, `.st-zero`.
- Produces the pattern Tasks 5–7 follow: `[data-draw][data-live] svg.story.<name> { --loop: … }`, with every loop part using `var(--loop)`.

- [ ] **Step 1: Write the failing tests.**

```ts
test.describe('stories', () => {
	test.use({ viewport: { width: 1280, height: 900 } });
	const loopParts: Record<string, string> = { chauffeur: '.cursor, .btn, .ripple, .st-a, .st-b, .st-tick, .leader-pulse, .stamp, .st-one, .st-zero' };
	for (const [slug, sel] of Object.entries(loopParts)) {
		test(`${slug}: every loop part runs on the drawing's one clock, only while live`, async ({ page }) => {
			await page.goto('/');
			const fig = page.locator(`#${slug} figure.drawing`);
			await fig.scrollIntoViewIfNeeded();
			await expect(fig).toHaveAttribute('data-live', '', { timeout: 6000 });
			const durs = await fig.locator(sel).evaluateAll((els) => els.map((e) => getComputedStyle(e).animationDuration));
			const loop = await fig.locator('svg.story').evaluate((s) => getComputedStyle(s).getPropertyValue('--loop').trim());
			expect(new Set(durs)).toEqual(new Set([loop]));
			await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
			await expect(fig).not.toHaveAttribute('data-live', '');
			expect(await fig.locator(sel).evaluateAll((els) => els.every((e) => getComputedStyle(e).animationName === 'none'))).toBe(true);
		});
	}
	test('chauffeur beats: "1 CHANGE" shows mid-loop, then the counter is back to 0', async ({ page }) => {
		await page.goto('/');
		const fig = page.locator('#chauffeur figure.drawing');
		await fig.scrollIntoViewIfNeeded();
		await expect(fig).toHaveAttribute('data-live', '', { timeout: 6000 });
		const at = (f: number) => fig.locator('.st-one').evaluate((el, f) => { const a = el.getAnimations()[0]; a.pause(); a.currentTime = (a.effect!.getTiming().duration as number) * f; return getComputedStyle(el).opacity; }, f);
		expect(await at(0.52)).toBe('1');
		expect(await at(0.7)).toBe('0');
	});
});
```

- [ ] **Step 2: Run them and see them fail.** `bunx playwright test tests/e2e/story.spec.ts -g stories`. Expected: FAIL. There are no animations, so the duration set doesn't match.

- [ ] **Step 3: Add the chauffeur loop CSS.**
  - Add the class `chauffeur` to the root `<svg class="story chauffeur" …>` in `PhoneNoEffect.svelte`.
  - Copy the spike's `[data-draw][data-live] svg.story …` rules and the `st-*` keyframes from `spike/chauffeur-story:src/app.css`, with every selector scoped to `svg.story.chauffeur`.
  - Set `--loop: 4.2s` and `.ripple + .ripple { animation-delay: 0.15s }`.
  - Include `.st-type`, `.st-tick` and `.st-one` base styles, and the `transform-box` rule for `.btn, .st-one, .st-zero`.
  - Override the generic loops for this drawing: the scoped rules (specificity ≥ 0,4,1) beat `[data-draw][data-live] .ripple`, `.pulse` and `.cursor`.

- [ ] **Step 4: Run them and see them pass.** `bunx playwright test tests/e2e/story.spec.ts tests/e2e/drawings.spec.ts tests/e2e/motion.spec.ts`. Expected: PASS.
- [ ] **Step 5: Leak check as its own step, then commit** `feat: chauffeur story loop — the tap that changes nothing`.

---

### Task 5: mri-viewer, scan volume and phone in 3D, with the slice story

**Files:** rewrite `src/lib/drawings/ScanSlices.svelte`; edit `src/app.css` and `tests/e2e/story.spec.ts`.

**Model.** Centre (200, 150); FROM = [-10, 12]; TO = [-26, 22]; `HALF` = 5 for the phone.

- **Stack:**
  - Five slice rectangles: `rectXZ(50, 190, y, -45, 45)` for y ∈ {64, 98, 132, 166, 200}. The bottom one (y = 200) gets `cls: 'stroke'` (full); the rest are `'stroke dim'`.
  - Four vertical corner edges from y = 64 to y = 200 at (50|190, ·, ±45), `'stroke dim'`.
  - The brain outline lives on the bottom slice plane: `<Plane o={[0, 200, 0]} u={[1, 0, 0]} v={[0, 0, 1]}>`, holding paths in local (x, z):
    - outline `M80 0 C 80 -34 180 -34 180 0 C 180 30 140 40 120 36 C 92 32 80 18 80 0 Z`
    - inner `dim` outline scaled about 0.85
    - two sulci arcs
    - a midline
- **Highlight:**
  - A signal-orange `rectXZ(50, 190, 64, -45, 45)` edge, `cls: 'stroke sig st-plane'`, rendered inside a plain `<g class="st-plane-g">`.
  - CSS moves it down the stack. Moving down by Δy in 3D moves its projection by `(0, Δy·cos(pitch))`, which is constant at the final pose. Expose it from SSR as `style="--drop: {136 * Math.cos(22 * Math.PI / 180)}px"`.
- **Phone:**
  - `front = roundedRect(270, 40, 96, 210, 16, HALF)`, back outline `w: 1.35`, band every 2, and a `.face-fill`.
  - The face plane `o={[0, 0, HALF]}` holds the existing phone artwork: screen, viewport rect, `vp-a/b/c` frames, controls, knob.
- **Bridge:**
  - A 3D polyline edge sampled from the stack's front-right corner (190, 166, 45) to the phone's left screen edge (276, 110, HALF): 8 points along a quadratic bulging toward −z, `cls: 'stroke dim'`.
  - The same points as a second edge with `cls: 'pulse live st-bridge'`.
- **Construction:** the `.c` guides go on the mid plane `o={[0, 0, 0]}`.
- **Flat callouts:**
  - "BRIDGE" at the projected bridge midpoint (SSR-computed `x, y`)
  - "AXIAL · T2" static
  - SLICE frames: five stacked `<text class="sigtext st-slice" style="--i:{n}">SLICE {115+n}/232</text>` at (272, 272)

**Story** (`--loop: 4.5s`, svg class `mri`):
1. 0–80%: `.st-plane-g` translates `0 → var(--drop)` in five steps. Each slice dwells: it moves over 4% and holds 12%, using `steps`-like keyframes at 0, 16, 32, 48, 64, 80%. It fades out by 88% and is back to 0 at 100%.
2. `.vp-a/.vp-b/.vp-c` re-time to `var(--loop)`, with each frame visible during its plane's dwell.
3. `.st-slice` frame *n* is visible during dwell *n*. The keyframe `st-slice` is offset with `animation-delay: calc(var(--i) * -0.16 * var(--loop))`, which keeps one shared clock.
4. `.knob` nudges ±4 px at each landing.
5. `.st-bridge` pulses once per dwell.

- [ ] **Step 1: Write the failing tests.**
  - Add `'mri-viewer'` to `models` in `story.spec.ts`.
  - Add a `loopParts['mri-viewer']` entry: `'.st-plane-g, .vp, .st-slice, .knob, .st-bridge'`.
  - Add a beat test: at loop fractions 0.10 and 0.42, the `.st-plane-g` translate y increases, and the visible `.st-slice` text changes (`SLICE 115/232` → `SLICE 117/232`).
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3:** Rewrite `ScanSlices.svelte` per the model, and add the scoped CSS.
- [ ] **Step 4: Run them and see them pass.**
  - Visual check: a reduced-motion screenshot at 1280×900. The stack must read as a 3D volume of 5 slices, the phone as a solid body facing mostly forward, and the bridge must land on the screen edge.
  - Record a GIF the same way as the spike (`recordVideo`, crop to the figure) and send it to the user.
- [ ] **Step 5:** `bun run check`. Run the leak check as its own step, then commit `feat: MRI drawing as a 3D scan volume and viewer — the slice plane steps through and the viewer follows`.

---

### Task 6: myne, vault door and passport in 3D, with the unlock story

**Files:** rewrite `src/lib/drawings/PassportVault.svelte`; edit `src/lib/client/models.js`, `src/app.css` and `tests/e2e/story.spec.ts`.

**Model.** Centre (200, 155); FROM = [-8, 4]; TO = [-24, 8]; door half-depth `DZ` = 10; passport half-depth `PZ` = 3.

- **Door** (`part: 'door'` on all of these):
  - front ring at z = +DZ, already drawn as the face-plane 2D circle r95
  - back ring `ring(140, 155, 95, -DZ, 32)` with `w: 1.35`
  - band every 2nd point of `ring(…, +DZ, 32)` to the back ring, `'stroke dim'`
  - the door face plane `o={[0, 0, DZ]}` holds: rings r95/78, hatch, bolt bosses, the hub r26/16, ticks, and the `.unlock` spokes group
- **Hinge block:** `box(30, 42, 122, 188, -DZ, DZ)`, static. Its face-plane artwork (rect and two lines) goes on a non-door plane at z = DZ.
- **Passport:**
  - front plane `o={[0, 0, PZ]}` holding the existing `.slide-out` artwork, with the check `path.stroke.sig` given the class `st-check`
  - back outline `roundedRect(248, 85, 112, 150, 8, -PZ)` with `w: 1.35`
  - band every 2
  - `.face-fill` rects on both the door face and the passport face
- **Flat callouts:**
  - The VAULT leader is `data-anchor="92,72,10"`.
  - The PASSPORT leader is `data-anchor="320,85,3"`.
  - "Ø 190", and RECORDS as stacked frames: `16,830 RECORDS` (`.st-rec-a`) and `16,831 RECORDS` (`.st-rec-b`).
  - The vault→passport pulse sits on a plane at z = 6.
- **Hinge swing** (`models.js`):
  - The root gets `data-hinge="42,10,24"`: axis x = 42, z = +DZ, maximum 24°.
  - `.st-clock` (an invisible element animated on `var(--loop)`) is the time source.
  - While the figure has `data-live` (watched with a `MutationObserver` on `fig`'s attributes), a rAF loop:
    1. reads `phase = (clock.getAnimations()[0].currentTime % loopMs) / loopMs`
    2. computes α = 24° × swing(phase), where swing is 0 until 0.28, eases in to 1 by 0.40, holds to 0.70, eases out to 0 by 0.84
    3. re-projects only the `data-part="door"` edges and planes, rotating each 3D point about the hinge axis by α first: `x' = hx + (x−hx)·cos α − (z−hz)·sin α; z' = hz + (x−hx)·sin α + (z−hz)·cos α`, which opens toward the viewer
  - It stops and restores the SSR strings when `data-live` drops.
  - Not under reduced motion (the script already returns early).

**Story** (`--loop: 4.5s`, svg class `myne`):
1. 0–22%: the `.unlock` spokes rotate 90° in the door-face plane (CSS, local coordinates).
2. 10–26%: the 8 bolt bosses (`.st-bolt`, each with `--a` = its angle) translate 6 units inward along their radius.
3. 28–40%: the door swings (JS).
4. 44–52%: `.st-check` stamps, with opacity 0→1 plus the scale and rotate thump.
5. 50–74%: `16,831` replaces `16,830`.
6. 70–84%: the door closes.
7. 84–96%: the bolts return and the spokes rotate back.

The check fades out at 96%.

- [ ] **Step 1: Write the failing tests.**
  - Add `'myne'` to `models`.
  - Add a `loopParts.myne` entry: `'.unlock, .st-bolt, .st-check, .st-rec-a, .st-rec-b, .st-clock'`.
  - Add tests:
    1. **Door swings:** with the clock paused at 0.35, some `data-part="door"` path's `d` differs from its SSR value; at 0.05 it equals SSR.
    2. **Off-screen stop:** after scrolling away, door paths equal SSR, and no rAF callback mutates them over 500 ms (sample `d` twice).
    3. **Reduced motion:** door paths equal SSR, and `getAnimations()` is empty.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.**
  - Rewrite `PassportVault.svelte`, add the hinge block to `models.js`, and add the scoped CSS.
  - Re-check the `models.js` budget (< 1,536 B). If it's over, move the hinge code into the same `set()` (one projector with an optional per-point pre-rotation) rather than a second projector.
- [ ] **Step 4: Run them and see them pass.** Then do the visual check and record a GIF for the user.
- [ ] **Step 5:** `bun run check`. Run the leak check as its own step, then commit `feat: Myne drawing as a 3D vault and passport — unlock, swing, stamp, count`.

---

### Task 7: hard-pills flat story

**Files:** edit `src/lib/drawings/ComicPanels.svelte` (classes only), `src/app.css` and `tests/e2e/story.spec.ts`.

**Story** (`--loop: 4.5s`, svg class `story pills`; there's no `data-model`, so `models.js` ignores it):
1. **0–30%, panels re-ink:** each panel's contents fade to 0.15 opacity and then re-draw. For the four panel-content groups (wrap them as `<g class="st-panel" style="--i:N">`), use `opacity` keyframes with a delay of `calc(var(--i) * 0.06 * var(--loop))`.
2. **30–40%:** the POW `.stamp` pops (scale 1→1.25→1 with `--ease-pop`), and the `.wobble` burst rotates ±8°.
3. **36–60%:** the halftone mask `.grow` circle scales 0→1, then holds.
4. **40–64%:** the "LATER…" arc (`.st-arc`, the `M170 236 C…` path) re-draws its dash 1→0.
5. **64–92%:** hold.
6. **92–100%:** the contents ease back to 0.15 opacity, ready to re-ink.

The panel borders stay solid throughout. The pill `.bob` keeps its own loop.

- [ ] **Step 1: Write the failing tests.** Add `loopParts['hard-pills']`: `'.st-panel, .stamp, .wobble, .grow, .st-arc'`. Add a beat test: at 0.02 of the loop, a `.st-panel` has opacity < 0.5 while every panel border `rect.stroke` is at dashoffset 0.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.** Do the class wrapping and the scoped CSS.
  - Keep `.layer` groups and parallax.
  - Hard Pills is flat, so `k = 0.5` still applies (`svg.story`), but there is no turn.
- [ ] **Step 4: Run them and see them pass.** Record a GIF for the user.
- [ ] **Step 5: Leak check as its own step, then commit** `feat: Hard Pills story loop — panels re-ink, POW, halftone, later`.

---

### Task 8: Fallbacks, reduced motion and the full suite

**Files:** edit `tests/e2e/story.spec.ts` and `src/app.css` (only if a test fails).

- [ ] **Step 1: Add the fallback tests.**

```ts
test.describe('everyone else sees finished final poses', () => {
	for (const slug of ['chauffeur', 'mri-viewer', 'myne'] as const) {
		test(`${slug}: reduced motion — final pose, drawn, nothing running`, async ({ page }) => {
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await page.goto('/');
			const fig = page.locator(`#${slug} figure.drawing`);
			await fig.scrollIntoViewIfNeeded();
			expect(await fig.evaluate((f) => f.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length)).toBe(0);
			expect(await fig.locator('.stroke').first().evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset))).toBe(0);
		});
		test(`${slug}: "All work" return lands on the final pose`, async ({ page }) => {
			await page.goto(`/work/${slug}`);
			const work = await page.locator('header [data-plane]').first().getAttribute('transform');
			await page.getByRole('link', { name: /All work/ }).click();
			await expect(page.locator('html')).toHaveClass(/\brestored\b/);
			expect(await page.locator(`#${slug} [data-plane]`).first().getAttribute('transform')).toBe(work);
		});
	}
});
```

- [ ] **Step 2: Run them.** `bunx playwright test tests/e2e/story.spec.ts tests/e2e/motion.spec.ts`. Expected: PASS. If one passes first time, confirm it can fail: temporarily delete the reduced-motion early return in `models.js`, then restore it.
- [ ] **Step 3: Full suite.** `bun run test > $WS/t8.log 2>&1; tail -30 $WS/t8.log` and `bun run check`. Expected: everything passes and the budgets are green.
- [ ] **Step 4: Leak check as its own step, then commit** `test: story drawings fallbacks — reduced motion, return trips`.

---

## After the last task

1. **Final whole-branch review** on the most capable model, with the Review Focus above verbatim.
2. **GIFs:** send the user a GIF of each of the four drawings, recorded from the final build.
3. **Merge and deploy, after the user approves the GIFs (the visual gate):** fast-forward `main` and push; pushing deploys. Then verify yashnaj.dev, and run mobile Lighthouse 3× on `/` and each `/work/*`.
