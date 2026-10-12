# yashnaj.dev Portfolio (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a fast, prerendered, blueprint-styled single-page portfolio for Yashal Najeeb to `https://yashnaj.dev` on Cloudflare.

**Architecture:** SvelteKit 2 + Svelte 5 fully prerendered with `adapter-static`. All copy lives in one typed data module; sections are small components; project illustrations are inline SVGs whose strokes draw in via pure CSS when an IntersectionObserver flips a `data-drawn` attribute. Output is served as static assets by a Cloudflare Worker (no Worker script).

**Tech Stack:** Bun 1.3, SvelteKit 2.70 (NOT 3.x), Svelte 5.57, Vite 7, Tailwind CSS 4.3, TypeScript 5.9, Vitest, Playwright 1.64, Fontsource (Inter Tight Variable, IBM Plex Mono), Wrangler 4, ImageMagick (`magick`), PyMuPDF (scratch venv only).

**Spec:** `docs/superpowers/specs/2026-10-12-portfolio-design.md`

## Global Constraints

- Package manager: Bun (`bun add`, `bun run`, `bunx`). Repo root: `/Users/Yash/Developer/repos/yashnaj-landing`.
- Pin SvelteKit to `^2.70.3` and `@sveltejs/adapter-static` to `^3.0.10` (adapter-static 4.x requires Kit 3 — do not use).
- Every route prerendered (`export const prerender = true`); no client-side data fetching; no Three.js in Phase 1.
- First-load JS < 30 KB gzipped.
- Palette tokens: `--color-ink #0b1f3a`, `--color-paper #f2ead8`, `--color-line-dim` = paper at 35% opacity (decorative only, never for readable text), `--color-signal #ff7a3d` (accent, sparingly). Text contrast ≥ 4.5:1.
- Fonts: Inter Tight Variable (sans), IBM Plex Mono (mono), self-hosted via Fontsource.
- **Confidentiality:** the client/agency/recruiter for the MRI project are never named in the site, metadata, alt text, file names, source, commits or docs. Forbidden terms live in gitignored `.confidential-terms` (one per line, case-insensitive). Never copy those terms into any tracked file. The MRI project is described only as "healthcare records platform (contract)".
- Public contact email: `yashnaj@proton.me`. GitHub `https://github.com/YashNaj`. LinkedIn `https://www.linkedin.com/in/yashnaj`.
- `prefers-reduced-motion: reduce` → drawings render finished, no motion.
- Confirmation gates (ask Yashal in chat and wait for an explicit yes): creating the GitHub repo; first deploy to `*.workers.dev`; adding the Cloudflare zone; changing nameservers at Porkbun; attaching the custom domain.
- Commit after every task. Commit messages end with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub
  ```
- Scratch files (downloaded photo, venv, Lighthouse reports) go in `$SCRATCH=/private/tmp/claude-502/-Users-Yash-Developer-repos-yashnaj-landing/59f38cf1-7dc3-46d2-b137-127d76c12114/scratchpad`, never in the repo.

## Review Focus

1. **JavaScript disabled or IntersectionObserver never firing** (crawlers, reader mode, print): drawings must be visible, not stuck at `stroke-dashoffset: 1`. Hidden state is gated on an `html.js` class. Test in Task 3.
2. **Narrow phones (360px wide):** no horizontal page scroll anywhere, including the copyable `brew install` command. Test in Task 8.
3. **Clipboard API unavailable or rejected** (insecure context, permission denied): the copy button must not throw; it selects the command text and tells the user to press ⌘C / Ctrl+C. Test in Task 3.
4. **Keyboard-only visitor:** every link/button reachable by Tab with a visible accent focus ring. Test in Task 8.
5. **Confidential term leaking via a less obvious path** (resume PDF text layer, OG image alt, JSON-LD, file names): scan all of `build/` (including the PDF's extracted text) against `.confidential-terms`. Test in Task 7.

---

## File Structure

```
package.json, bun.lock, svelte.config.js, vite.config.ts, tsconfig.json, playwright.config.ts, wrangler.jsonc
src/
  app.html                         # sets html.js class inline before paint
  app.css                          # Tailwind import, theme tokens, grid bg, drawing animation CSS
  app.d.ts
  lib/
    data/site.ts                   # profile, projects, alsoBuilt, experience (single source of truth)
    components/
      DrawOnView.svelte            # IO wrapper → data-drawn; role=img + aria-label
      CopyCommand.svelte           # copy-to-clipboard with selection fallback
      TitleBlock.svelte            # drafting title block
      Hero.svelte
      ProjectSheet.svelte
      AlsoBuilt.svelte
      Experience.svelte
      Footer.svelte
    drawings/
      PhoneNoEffect.svelte         # chauffeur
      PassportVault.svelte         # Myne Global
      ScanSlices.svelte            # MRI viewer
      ComicPanels.svelte           # Hard Pills
  routes/
    +layout.ts                     # prerender = true
    +layout.svelte                 # fonts, css, <head> meta, JSON-LD
    +page.svelte                   # composes sections
    +error.svelte                  # blueprint 404
static/
  favicon.svg, og.png, robots.txt, Yashal-Najeeb-Resume.pdf
  img/yashal-320.webp, img/yashal-640.webp
scripts/
  og.html                          # source for og.png (screenshotted by Playwright)
  make-og.ts
tests/
  unit/site.test.ts
  unit/confidentiality.test.ts
  e2e/hero.spec.ts
  e2e/work.spec.ts
  e2e/sections.spec.ts
  e2e/layout.spec.ts
```

---

### Task 1: Scaffold SvelteKit + Tailwind + test harness

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `playwright.config.ts`, `src/app.html`, `src/app.css`, `src/app.d.ts`, `src/routes/+layout.ts`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `tests/e2e/hero.spec.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: theme utilities `bg-ink`, `text-paper`, `text-signal`, `border-line-dim`, `font-sans`, `font-mono`; the `html.js` class; scripts `dev`, `build`, `preview`, `check`, `test:unit`, `test:e2e`, `test`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "yashnaj-landing",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "prepare": "svelte-kit sync || echo ''",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "test": "bun run build && vitest run && playwright test"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
bun add -d @sveltejs/kit@^2.70.3 @sveltejs/adapter-static@^3.0.10 @sveltejs/vite-plugin-svelte@^6.2.4 svelte@^5.57.2 vite@^7.3.7 typescript@^5.9.3 svelte-check@^4.7.6 tailwindcss@^4.3.3 @tailwindcss/vite@^4.3.3 vitest @playwright/test@^1.64.0 @fontsource-variable/inter-tight@^5.3.0 @fontsource/ibm-plex-mono@^5.3.0
bunx playwright install chromium
```
Expected: installs succeed; `bun pm ls | grep @sveltejs/kit` shows `2.70.x`.

- [ ] **Step 3: Create config files**

`svelte.config.js`:
```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ fallback: '404.html' })
	}
};
```

`vite.config.ts`:
```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: { include: ['tests/unit/**/*.test.ts'] }
});
```

`tsconfig.json`:
```json
{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
		"allowJs": true,
		"checkJs": true,
		"esModuleInterop": true,
		"forceConsistentCasingInFileNames": true,
		"resolveJsonModule": true,
		"skipLibCheck": true,
		"sourceMap": true,
		"strict": true,
		"moduleResolution": "bundler"
	}
}
```

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'tests/e2e',
	use: { baseURL: 'http://localhost:4173' },
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'bun run build && bunx vite preview --port 4173 --strictPort',
		port: 4173,
		reuseExistingServer: !process.env.CI
	}
});
```

`src/app.d.ts`:
```ts
declare global {
	namespace App {}
}
export {};
```

Append to `.gitignore`:
```
test-results/
playwright-report/
```

- [ ] **Step 4: Create `src/app.html`**

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="theme-color" content="#0b1f3a" />
		<link rel="icon" href="%sveltekit.assets%/favicon.svg" type="image/svg+xml" />
		<script>
			document.documentElement.classList.add('js');
		</script>
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

- [ ] **Step 5: Create `src/app.css`**

```css
@import 'tailwindcss';

@theme {
	--color-ink: #0b1f3a;
	--color-ink-2: #12294a;
	--color-paper: #f2ead8;
	--color-line-dim: rgb(242 234 216 / 0.35);
	--color-signal: #ff7a3d;
	--font-sans: 'Inter Tight Variable', ui-sans-serif, system-ui, sans-serif;
	--font-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
}

html {
	color-scheme: dark;
	background: var(--color-ink);
	color: var(--color-paper);
	scroll-behavior: smooth;
}

body {
	margin: 0;
	font-family: var(--font-sans);
	background-color: var(--color-ink);
	background-image:
		linear-gradient(rgb(242 234 216 / 0.06) 1px, transparent 1px),
		linear-gradient(90deg, rgb(242 234 216 / 0.06) 1px, transparent 1px),
		linear-gradient(rgb(242 234 216 / 0.025) 1px, transparent 1px),
		linear-gradient(90deg, rgb(242 234 216 / 0.025) 1px, transparent 1px);
	background-size:
		96px 96px,
		96px 96px,
		24px 24px,
		24px 24px;
	-webkit-font-smoothing: antialiased;
	overflow-x: hidden;
}

:focus-visible {
	outline: 2px solid var(--color-signal);
	outline-offset: 3px;
	border-radius: 2px;
}

@media (prefers-reduced-motion: reduce) {
	html {
		scroll-behavior: auto;
	}
}
```

- [ ] **Step 6: Create routes**

`src/routes/+layout.ts`:
```ts
export const prerender = true;
export const trailingSlash = 'never';
```

`src/routes/+layout.svelte`:
```svelte
<script lang="ts">
	import '@fontsource-variable/inter-tight/wght.css';
	import '@fontsource/ibm-plex-mono/latin-400.css';
	import '@fontsource/ibm-plex-mono/latin-500.css';
	import '../app.css';

	let { children } = $props();
</script>

{@render children()}
```

`src/routes/+page.svelte` (temporary; replaced in Task 4):
```svelte
<svelte:head><title>Yashal Najeeb</title></svelte:head>
<main><h1 class="font-sans text-paper">Yashal Najeeb</h1></main>
```

- [ ] **Step 7: Write the failing e2e smoke test** `tests/e2e/hero.spec.ts`

```ts
import { expect, test } from '@playwright/test';

test('home renders the name as the only h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toHaveCount(1);
	await expect(page.locator('h1')).toContainText('Yashal Najeeb');
	await expect(page.locator('html')).toHaveClass(/\bjs\b/);
});
```

- [ ] **Step 8: Run checks and test**

Run: `bun run check && bun run test:e2e`
Expected: svelte-check `0 errors`; Playwright `1 passed`. (If it fails, fix config — the test is the gate for the scaffold.)

- [ ] **Step 9: Verify static output**

Run: `ls build && test -f build/index.html && test -f build/404.html && echo OK`
Expected: `OK`.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "chore: scaffold SvelteKit 2 + Tailwind 4 static site with test harness" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub"
```

---

### Task 2: Site data module

**Files:**
- Create: `src/lib/data/site.ts`, `tests/unit/site.test.ts`

**Interfaces:**
- Produces (exact exports from `$lib/data/site`):
  - `type Link = { label: string; href: string }`
  - `type ProjectSlug = 'chauffeur' | 'myne' | 'mri-viewer' | 'hard-pills'`
  - `type Project = { slug: ProjectSlug; sheet: string; title: string; tagline: string; summary: string; metric: string; stack: string[]; links: Link[]; command?: string; drawingLabel: string }`
  - `const profile: { name: string; role: string; pitch: string; location: string; email: string; github: string; linkedin: string; resume: string; photoAlt: string }`
  - `const projects: Project[]` (exactly 4, in sheet order 01–04)
  - `const alsoBuilt: { name: string; description: string }[]`
  - `const experience: { org: string; role: string; place: string; period: string; note: string }[]`

- [ ] **Step 1: Write the failing test** `tests/unit/site.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { alsoBuilt, experience, profile, projects } from '../../src/lib/data/site';

describe('site data', () => {
	it('has exactly the four hero projects in sheet order', () => {
		expect(projects.map((p) => p.slug)).toEqual(['chauffeur', 'myne', 'mri-viewer', 'hard-pills']);
		expect(projects.map((p) => p.sheet)).toEqual(['01', '02', '03', '04']);
	});

	it('every project has the fields a sheet renders', () => {
		for (const p of projects) {
			expect(p.title.length).toBeGreaterThan(0);
			expect(p.summary.length).toBeGreaterThan(40);
			expect(p.metric.length).toBeGreaterThan(0);
			expect(p.stack.length).toBeGreaterThan(0);
			expect(p.drawingLabel.length).toBeGreaterThan(10);
			for (const l of p.links) expect(l.href).toMatch(/^https:\/\//);
		}
	});

	it('the MRI project has no outbound links', () => {
		expect(projects.find((p) => p.slug === 'mri-viewer')!.links).toEqual([]);
	});

	it('profile contact details match the spec', () => {
		expect(profile.email).toBe('yashnaj@proton.me');
		expect(profile.github).toBe('https://github.com/YashNaj');
		expect(profile.linkedin).toBe('https://www.linkedin.com/in/yashnaj');
		expect(profile.resume).toBe('/Yashal-Najeeb-Resume.pdf');
	});

	it('lists also-built and experience entries', () => {
		expect(alsoBuilt.map((a) => a.name)).toEqual(['Serveus', 'Rider365', 'AutoAce', 'FieldDiligence']);
		expect(experience).toHaveLength(3);
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bunx vitest run tests/unit/site.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/data/site`.

- [ ] **Step 3: Implement `src/lib/data/site.ts`**

```ts
export type Link = { label: string; href: string };
export type ProjectSlug = 'chauffeur' | 'myne' | 'mri-viewer' | 'hard-pills';
export type Project = {
	slug: ProjectSlug;
	sheet: string;
	title: string;
	tagline: string;
	summary: string;
	metric: string;
	stack: string[];
	links: Link[];
	command?: string;
	drawingLabel: string;
};

export const profile = {
	name: 'Yashal Najeeb',
	role: 'Full-Stack Product Engineer · iOS, React Native, TypeScript, Postgres',
	pitch: 'Product engineer who takes software from zero to the App Store.',
	location: 'Corona, CA',
	email: 'yashnaj@proton.me',
	github: 'https://github.com/YashNaj',
	linkedin: 'https://www.linkedin.com/in/yashnaj',
	resume: '/Yashal-Najeeb-Resume.pdf',
	photoAlt: 'Portrait of Yashal Najeeb'
};

export const projects: Project[] = [
	{
		slug: 'chauffeur',
		sheet: '01',
		title: 'chauffeur',
		tagline: 'Lets coding agents drive the iOS Simulator — and tells them the truth.',
		summary:
			'Agents tap a disabled button and report “done.” chauffeur hands the agent the screen as an outline it can reason about, taps through the Simulator’s own input system, and verifies every action against what actually changed: NO EFFECT, INTERCEPTED or APP CRASHED, with the line that caused it.',
		metric:
			'180-run benchmark vs Xcode 27’s MCP: under half the turns at ~1/6 the cost, 45/45 tasks verified on Opus.',
		stack: ['Swift', 'MCP', 'XCTest', 'Homebrew'],
		links: [{ label: 'GitHub', href: 'https://github.com/YashNaj/chauffeur' }],
		command: 'brew install yashnaj/chauffeur/chauffeur',
		drawingLabel:
			'Line drawing of a phone: a tap ripple lands on a greyed-out button and a NO EFFECT label stamps beside it.'
	},
	{
		slug: 'myne',
		sheet: '02',
		title: 'Myne Global',
		tagline: 'Provenance for luxury goods, from purchase to resale.',
		summary:
			'Built end to end as lead engineer: SvelteKit API, Postgres with row-level security, a SwiftUI app and Stripe/StoreKit billing. Owner-held-key encryption carries every ownership transfer, dealers issue Myne Passports at the point of sale, and every buyer search checks a registry of 16,830 stolen-item records.',
		metric: '$10M+ in registered assets · 400 collectors · 12 NYC dealers',
		stack: ['SwiftUI', 'SvelteKit', 'Postgres', 'Supabase', 'Stripe', 'StoreKit 2'],
		links: [{ label: 'myneglobal.com', href: 'https://myneglobal.com' }],
		drawingLabel:
			'Exploded-view drawing of a vault door with a Myne Passport pulled out beside it, with callout labels.'
	},
	{
		slug: 'mri-viewer',
		sheet: '03',
		title: 'Mobile MRI/CT viewer',
		tagline: 'Healthcare records platform (contract).',
		summary:
			'Clinicians couldn’t view scans on mobile: the platform’s legacy imaging viewer predated touch support. Instead of a risky framework upgrade, I built a modern Cornerstone3D renderer inside a WebView and moved every control — slice scrubber, series, window/level, pan, pinch-zoom — into native React Native over a small message bridge. Also rebuilt authorization across 156 API routes and stood up the first iOS release path.',
		metric: 'First image on device in under 2 s · 57 of 68 UAT defects closed (31/31 on mobile)',
		stack: ['React Native', 'Cornerstone3D', 'DICOMweb', 'Express', 'AWS'],
		links: [],
		drawingLabel:
			'Abstract drawing of stacked scan slices fanning out beside a phone with a slice scrubber.'
	},
	{
		slug: 'hard-pills',
		sheet: '04',
		title: 'Hard Pills to Swallow',
		tagline: 'A pop-art blog its writer runs entirely herself.',
		summary:
			'Public site plus a full admin: TipTap editor with autosave and scheduling, banner styling, SEO panel, media library and mailing list. Database triggers make “publish now” and scheduled posts behave the same — the email goes out once and the post auto-shares to X and Threads.',
		metric: 'Live in production, run end to end by a non-technical writer',
		stack: ['SvelteKit', 'Supabase', 'Drizzle', 'Tailwind', 'Vercel'],
		links: [{ label: 'hardpillstoswallow.com', href: 'https://hardpillstoswallow.com' }],
		drawingLabel: 'Comic-book page drawing: panel grid, halftone shading and a speech bubble.'
	}
];

export const alsoBuilt = [
	{ name: 'Serveus', description: 'On-demand parcel delivery — App Store, 2026' },
	{ name: 'Rider365', description: 'Motorcycle ride planning in Expo — App Store, 2026' },
	{ name: 'AutoAce', description: 'Voice-tone and background-noise classifier for call recordings, built in 9 days' },
	{ name: 'FieldDiligence', description: 'Jobber-to-QuickBooks invoice matcher that shrinks a month of invoices to a short review list' }
];

export const experience = [
	{
		org: 'Myne Global',
		role: 'Lead Engineer',
		place: 'Los Angeles',
		period: '2021 – Present',
		note: 'Built the provenance platform end to end: web, iOS, billing, encryption and dealer network.'
	},
	{
		org: 'Healthcare records platform',
		role: 'Senior Engineer (contract)',
		place: 'Irvine, CA',
		period: 'May – Jun 2026',
		note: 'Sole engineer across five repositories; mobile MRI/CT viewing, authorization hardening, first iOS release.'
	},
	{
		org: 'Freelance',
		role: 'Web Developer',
		place: 'Los Angeles',
		period: '2021 – 2023',
		note: 'React sites and a custom Shopify storefront with members-only drops for small businesses.'
	}
];
```

- [ ] **Step 4: Run to verify pass**

Run: `bunx vitest run tests/unit/site.test.ts`
Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add typed site data module" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub"
```

---

### Task 3: Selected-work section — drawing system, copy button, four drawings, project sheets

**Files:**
- Create: `src/lib/components/DrawOnView.svelte`, `src/lib/components/CopyCommand.svelte`, `src/lib/components/ProjectSheet.svelte`, `src/lib/drawings/PhoneNoEffect.svelte`, `src/lib/drawings/PassportVault.svelte`, `src/lib/drawings/ScanSlices.svelte`, `src/lib/drawings/ComicPanels.svelte`, `tests/e2e/work.spec.ts`
- Modify: `src/app.css` (append drawing CSS), `src/routes/+page.svelte`

**Interfaces:**
- Consumes: `projects`, `Project`, `ProjectSlug` from `$lib/data/site`.
- Produces:
  - `<DrawOnView label: string; children: Snippet; class?: string>` → renders `<figure class="drawing" data-draw role="img" aria-label={label}>`, adds `data-drawn` once ≥35% visible.
  - Drawing CSS contract: any SVG element with class `stroke` and `pathLength="1"` draws in; class `after` fades in after the strokes; inline style `--i: n` staggers.
  - `<CopyCommand command: string>`; button has `data-testid="copy-command"`; status text in `[data-testid="copy-status"]` becomes `Copied` or `Press ⌘C / Ctrl+C`.
  - `<ProjectSheet project: Project; Drawing: Component; flip?: boolean>` → `<article data-testid="project-sheet" id={slug}>`.
  - `drawings: Record<ProjectSlug, Component>` defined in `+page.svelte`.

- [ ] **Step 1: Write the failing tests** `tests/e2e/work.spec.ts`

```ts
import { expect, test, type Page } from '@playwright/test';

const dashOffset = (page: Page, slug: string) =>
	page
		.locator(`#${slug} figure.drawing .stroke`)
		.first()
		.evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset));

test('renders four project sheets in order with labelled drawings', async ({ page }) => {
	await page.goto('/');
	const sheets = page.getByTestId('project-sheet');
	await expect(sheets).toHaveCount(4);
	await expect(sheets.locator('h3')).toHaveText([
		'chauffeur',
		'Myne Global',
		'Mobile MRI/CT viewer',
		'Hard Pills to Swallow'
	]);
	for (const fig of await page.locator('figure.drawing').all()) {
		await expect(fig).toHaveAttribute('role', 'img');
		expect((await fig.getAttribute('aria-label'))!.length).toBeGreaterThan(10);
	}
});

test('a drawing starts undrawn and draws when scrolled into view', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 700 });
	await page.goto('/');
	expect(await dashOffset(page, 'hard-pills')).toBeGreaterThan(0.5);
	await page.locator('#hard-pills').scrollIntoViewIfNeeded();
	await expect(page.locator('#hard-pills figure.drawing')).toHaveAttribute('data-drawn', '');
	await expect.poll(() => dashOffset(page, 'hard-pills'), { timeout: 5000 }).toBe(0);
});

test('reduced motion shows finished drawings immediately', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	expect(await dashOffset(page, 'hard-pills')).toBe(0);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });
	test('drawings are fully visible', async ({ page }) => {
		await page.goto('/');
		expect(await dashOffset(page, 'chauffeur')).toBe(0);
		expect(await dashOffset(page, 'hard-pills')).toBe(0);
	});
});

test('copy button copies the brew command', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/');
	await page.getByTestId('copy-command').click();
	await expect(page.getByTestId('copy-status')).toHaveText('Copied');
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
		'brew install yashnaj/chauffeur/chauffeur'
	);
});

test('copy button falls back to selecting text when clipboard is unavailable', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
	});
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto('/');
	await page.getByTestId('copy-command').click();
	await expect(page.getByTestId('copy-status')).toHaveText('Press ⌘C / Ctrl+C');
	expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
		'brew install yashnaj/chauffeur/chauffeur'
	);
	expect(errors).toEqual([]);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bunx playwright test tests/e2e/work.spec.ts`
Expected: FAIL — `project-sheet` count is 0.

- [ ] **Step 3: Append drawing CSS to `src/app.css`**

```css
/* ---------- Self-drawing illustrations ---------- */
.drawing {
	margin: 0;
	color: var(--color-paper);
}
.drawing svg {
	display: block;
	width: 100%;
	height: auto;
	overflow: visible;
}
.drawing .stroke {
	fill: none;
	stroke: currentColor;
	stroke-width: 1.6;
	stroke-linecap: round;
	stroke-linejoin: round;
}
.drawing .dim {
	stroke: var(--color-line-dim);
}
.drawing .sig {
	stroke: var(--color-signal);
}
.drawing text {
	font-family: var(--font-mono);
	font-size: 11px;
	letter-spacing: 0.08em;
	fill: currentColor;
}
.drawing text.sig {
	fill: var(--color-signal);
	stroke: none;
}

html.js [data-draw] .stroke {
	stroke-dasharray: 1;
	stroke-dashoffset: 1;
	transition: stroke-dashoffset 900ms cubic-bezier(0.6, 0, 0.2, 1);
	transition-delay: calc(var(--i, 0) * 90ms);
}
html.js [data-draw][data-drawn] .stroke {
	stroke-dashoffset: 0;
}
html.js [data-draw] .after {
	opacity: 0;
	transition: opacity 400ms ease-out;
	transition-delay: calc(var(--i, 0) * 90ms + 900ms);
}
html.js [data-draw][data-drawn] .after {
	opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
	html.js [data-draw] .stroke {
		stroke-dashoffset: 0;
		transition: none;
	}
	html.js [data-draw] .after {
		opacity: 1;
		transition: none;
	}
}
```

Note: elements that are both `stroke` and `after` (e.g. ripples) draw then fade correctly because the two properties are independent.

- [ ] **Step 4: Create `src/lib/components/DrawOnView.svelte`**

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	let { label, children, class: klass = '' }: { label: string; children: Snippet; class?: string } =
		$props();

	let el: HTMLElement;
	let drawn = $state(false);

	$effect(() => {
		if (!('IntersectionObserver' in window)) {
			drawn = true;
			return;
		}
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					drawn = true;
					io.disconnect();
				}
			},
			{ threshold: 0.35 }
		);
		io.observe(el);
		return () => io.disconnect();
	});
</script>

<figure
	bind:this={el}
	class="drawing {klass}"
	data-draw
	data-drawn={drawn ? '' : undefined}
	role="img"
	aria-label={label}
>
	{@render children()}
</figure>
```

- [ ] **Step 5: Create `src/lib/components/CopyCommand.svelte`**

```svelte
<script lang="ts">
	let { command }: { command: string } = $props();

	let code: HTMLElement;
	let status = $state('');

	function selectCode() {
		const range = document.createRange();
		range.selectNodeContents(code);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);
	}

	async function copy() {
		try {
			if (!navigator.clipboard) throw new Error('clipboard unavailable');
			await navigator.clipboard.writeText(command);
			status = 'Copied';
		} catch {
			selectCode();
			status = 'Press ⌘C / Ctrl+C';
		}
	}
</script>

<div class="flex max-w-full items-center gap-2 border border-line-dim bg-ink/80 font-mono text-sm">
	<span class="pl-3 text-signal" aria-hidden="true">$</span>
	<code bind:this={code} class="min-w-0 flex-1 overflow-x-auto py-2 whitespace-nowrap">{command}</code>
	<button
		type="button"
		data-testid="copy-command"
		class="shrink-0 border-l border-line-dim px-3 py-2 uppercase tracking-widest hover:text-signal"
		onclick={copy}
	>
		Copy
	</button>
</div>
<p data-testid="copy-status" class="mt-1 min-h-5 font-mono text-xs text-signal" aria-live="polite">{status}</p>
```

- [ ] **Step 6: Create the four drawings**

All use `viewBox="0 0 400 300"`, `aria-hidden="true"` on the `<svg>`, `pathLength="1"` + class `stroke` on every drawn element, and `style="--i:n"` for stagger.

`src/lib/drawings/PhoneNoEffect.svelte`:
```svelte
<svg viewBox="0 0 400 300" aria-hidden="true">
	<!-- dimension line -->
	<line class="stroke dim" pathLength="1" style="--i:0" x1="105" y1="20" x2="105" y2="280" />
	<line class="stroke dim" pathLength="1" style="--i:0" x1="98" y1="20" x2="112" y2="20" />
	<line class="stroke dim" pathLength="1" style="--i:0" x1="98" y1="280" x2="112" y2="280" />
	<text class="after" style="--i:0" x="58" y="154">H 260</text>
	<!-- phone -->
	<rect class="stroke" pathLength="1" style="--i:1" x="130" y="20" width="140" height="260" rx="22" />
	<rect class="stroke" pathLength="1" style="--i:2" x="180" y="32" width="40" height="8" rx="4" />
	<line class="stroke dim" pathLength="1" style="--i:3" x1="150" y1="72" x2="230" y2="72" />
	<rect class="stroke" pathLength="1" style="--i:4" x="150" y="92" width="100" height="22" rx="4" />
	<rect class="stroke" pathLength="1" style="--i:5" x="150" y="124" width="100" height="22" rx="4" />
	<!-- disabled button -->
	<rect class="stroke dim" pathLength="1" style="--i:6" x="150" y="170" width="100" height="28" rx="6" />
	<line class="stroke dim" pathLength="1" style="--i:6" x1="180" y1="184" x2="220" y2="184" />
	<!-- tap ripple -->
	<circle class="stroke sig after" pathLength="1" style="--i:7" cx="200" cy="184" r="7" />
	<circle class="stroke sig after" pathLength="1" style="--i:8" cx="200" cy="184" r="17" />
	<!-- callout -->
	<polyline class="stroke sig after" pathLength="1" style="--i:9" points="217,178 300,140 360,140" />
	<text class="sig after" style="--i:9" x="300" y="132">NO EFFECT</text>
</svg>
```

`src/lib/drawings/PassportVault.svelte`:
```svelte
<svg viewBox="0 0 400 300" aria-hidden="true">
	<!-- vault door -->
	<circle class="stroke" pathLength="1" style="--i:0" cx="140" cy="155" r="95" />
	<circle class="stroke" pathLength="1" style="--i:1" cx="140" cy="155" r="72" />
	<circle class="stroke" pathLength="1" style="--i:2" cx="140" cy="155" r="14" />
	<line class="stroke" pathLength="1" style="--i:3" x1="140" y1="141" x2="140" y2="95" />
	<line class="stroke" pathLength="1" style="--i:3" x1="128" y1="162" x2="88" y2="185" />
	<line class="stroke" pathLength="1" style="--i:3" x1="152" y1="162" x2="192" y2="185" />
	<!-- explode arrow -->
	<line class="stroke dim" pathLength="1" style="--i:4" x1="200" y1="160" x2="235" y2="160" />
	<polyline class="stroke dim" pathLength="1" style="--i:4" points="228,154 235,160 228,166" />
	<!-- passport -->
	<rect class="stroke" pathLength="1" style="--i:5" x="248" y="85" width="112" height="150" rx="8" />
	<circle class="stroke" pathLength="1" style="--i:6" cx="304" cy="140" r="22" />
	<path class="stroke" pathLength="1" style="--i:7" d="M292 140 l8 8 l16 -16" />
	<line class="stroke dim" pathLength="1" style="--i:8" x1="266" y1="190" x2="342" y2="190" />
	<line class="stroke dim" pathLength="1" style="--i:8" x1="266" y1="206" x2="320" y2="206" />
	<!-- callouts -->
	<polyline class="stroke sig after" pathLength="1" style="--i:9" points="320,85 345,50 385,50" />
	<text class="after" style="--i:9" x="318" y="42">PASSPORT</text>
	<polyline class="stroke sig after" pathLength="1" style="--i:10" points="90,75 70,40 20,40" />
	<text class="after" style="--i:10" x="20" y="32">VAULT</text>
</svg>
```

`src/lib/drawings/ScanSlices.svelte`:
```svelte
<svg viewBox="0 0 400 300" aria-hidden="true">
	<!-- slices, back to front -->
	<path class="stroke dim" pathLength="1" style="--i:0" d="M40 70 L170 50 L220 95 L90 115 Z" />
	<path class="stroke dim" pathLength="1" style="--i:1" d="M40 110 L170 90 L220 135 L90 155 Z" />
	<path class="stroke dim" pathLength="1" style="--i:2" d="M40 150 L170 130 L220 175 L90 195 Z" />
	<path class="stroke" pathLength="1" style="--i:3" d="M40 190 L170 170 L220 215 L90 235 Z" />
	<!-- abstract anatomy contour on front slice -->
	<path
		class="stroke"
		pathLength="1"
		style="--i:4"
		d="M95 205 C105 186 150 180 168 192 C184 203 170 222 140 224 C112 226 88 220 95 205 Z"
	/>
	<path class="stroke dim" pathLength="1" style="--i:5" d="M118 204 C128 198 146 198 152 206" />
	<!-- phone -->
	<rect class="stroke" pathLength="1" style="--i:6" x="270" y="40" width="96" height="210" rx="16" />
	<rect class="stroke" pathLength="1" style="--i:7" x="282" y="70" width="72" height="72" />
	<path
		class="stroke dim"
		pathLength="1"
		style="--i:8"
		d="M295 112 C300 95 336 92 342 106 C347 120 330 130 316 130 C302 130 292 124 295 112 Z"
	/>
	<!-- scrubber -->
	<line class="stroke dim" pathLength="1" style="--i:9" x1="284" y1="170" x2="352" y2="170" />
	<circle class="stroke sig after" pathLength="1" style="--i:10" cx="322" cy="170" r="5" />
	<text class="sig after" style="--i:10" x="282" y="196">SLICE 117/232</text>
	<!-- link from slices to phone -->
	<line class="stroke dim" pathLength="1" style="--i:11" x1="222" y1="160" x2="268" y2="120" />
</svg>
```

`src/lib/drawings/ComicPanels.svelte`:
```svelte
<svg viewBox="0 0 400 300" aria-hidden="true">
	<defs>
		<pattern id="halftone" width="8" height="8" patternUnits="userSpaceOnUse">
			<circle cx="4" cy="4" r="1.6" fill="currentColor" />
		</pattern>
	</defs>
	<rect class="stroke" pathLength="1" style="--i:0" x="40" y="30" width="320" height="240" />
	<line class="stroke" pathLength="1" style="--i:1" x1="40" y1="140" x2="360" y2="140" />
	<line class="stroke" pathLength="1" style="--i:2" x1="210" y1="30" x2="210" y2="140" />
	<line class="stroke" pathLength="1" style="--i:3" x1="150" y1="140" x2="150" y2="270" />
	<!-- speech bubble -->
	<path
		class="stroke"
		pathLength="1"
		style="--i:4"
		d="M70 60 h105 a12 12 0 0 1 12 12 v30 a12 12 0 0 1 -12 12 h-70 l-18 16 l4 -16 h-21 a12 12 0 0 1 -12 -12 v-30 a12 12 0 0 1 12 -12 Z"
	/>
	<line class="stroke dim" pathLength="1" style="--i:5" x1="80" y1="80" x2="160" y2="80" />
	<line class="stroke dim" pathLength="1" style="--i:5" x1="80" y1="96" x2="140" y2="96" />
	<!-- burst -->
	<path
		class="stroke sig"
		pathLength="1"
		style="--i:6"
		d="M285 52 L295 75 L320 68 L308 90 L330 104 L304 108 L308 132 L288 116 L270 134 L268 110 L244 106 L264 92 L252 70 L276 76 Z"
	/>
	<text class="sig after" style="--i:7" x="276" y="98">!!</text>
	<!-- halftone panels -->
	<rect class="after" style="--i:8" x="44" y="144" width="102" height="122" fill="url(#halftone)" fill-opacity="0.5" />
	<rect class="after" style="--i:9" x="154" y="200" width="202" height="66" fill="url(#halftone)" fill-opacity="0.35" />
	<path class="stroke" pathLength="1" style="--i:10" d="M170 230 C210 170 280 170 340 230" />
</svg>
```

Halftone rects use `fill-opacity` (not `opacity`) because the `.after` class animates `opacity` and would override it.

- [ ] **Step 7: Create `src/lib/components/ProjectSheet.svelte`**

```svelte
<script lang="ts">
	import type { Component } from 'svelte';
	import type { Project } from '$lib/data/site';
	import CopyCommand from './CopyCommand.svelte';
	import DrawOnView from './DrawOnView.svelte';

	let { project, Drawing, flip = false }: { project: Project; Drawing: Component; flip?: boolean } =
		$props();
</script>

<article
	id={project.slug}
	data-testid="project-sheet"
	class="relative grid scroll-mt-8 gap-8 border border-line-dim bg-ink/70 p-5 md:grid-cols-2 md:items-center md:gap-12 md:p-10"
>
	<span class="absolute top-3 right-4 font-mono text-xs tracking-widest text-paper/70">
		SHEET {project.sheet} / 04
	</span>

	<DrawOnView label={project.drawingLabel} class={flip ? 'md:order-2' : ''}>
		<Drawing />
	</DrawOnView>

	<div class="min-w-0">
		<h3 class="text-3xl font-semibold tracking-tight md:text-4xl">{project.title}</h3>
		<p class="mt-2 font-mono text-sm text-paper/80">{project.tagline}</p>
		<p class="mt-5 leading-relaxed text-paper/90">{project.summary}</p>
		<p class="mt-5 border-l-2 border-signal pl-3 font-mono text-sm text-paper">{project.metric}</p>
		<ul class="mt-5 flex flex-wrap gap-2" aria-label="Stack">
			{#each project.stack as tech}
				<li class="border border-line-dim px-2 py-0.5 font-mono text-xs uppercase tracking-wider">
					{tech}
				</li>
			{/each}
		</ul>
		{#if project.command}
			<div class="mt-5"><CopyCommand command={project.command} /></div>
		{/if}
		{#if project.links.length}
			<p class="mt-4 flex flex-wrap gap-4 font-mono text-sm">
				{#each project.links as link}
					<a class="underline decoration-signal underline-offset-4 hover:text-signal" href={link.href}
						>{link.label} ↗</a
					>
				{/each}
			</p>
		{/if}
	</div>
</article>
```

- [ ] **Step 8: Wire into `src/routes/+page.svelte`**

```svelte
<script lang="ts">
	import type { Component } from 'svelte';
	import ProjectSheet from '$lib/components/ProjectSheet.svelte';
	import { projects, type ProjectSlug } from '$lib/data/site';
	import ComicPanels from '$lib/drawings/ComicPanels.svelte';
	import PassportVault from '$lib/drawings/PassportVault.svelte';
	import PhoneNoEffect from '$lib/drawings/PhoneNoEffect.svelte';
	import ScanSlices from '$lib/drawings/ScanSlices.svelte';

	const drawings: Record<ProjectSlug, Component> = {
		chauffeur: PhoneNoEffect,
		myne: PassportVault,
		'mri-viewer': ScanSlices,
		'hard-pills': ComicPanels
	};
</script>

<svelte:head><title>Yashal Najeeb</title></svelte:head>

<main class="mx-auto max-w-6xl px-4 md:px-8">
	<h1 class="py-24 text-5xl font-semibold">Yashal Najeeb</h1>

	<section id="work" aria-labelledby="work-heading" class="py-16">
		<h2 id="work-heading" class="mb-10 font-mono text-sm tracking-[0.3em] text-paper/80 uppercase">
			Selected work
		</h2>
		<div class="grid gap-10">
			{#each projects as project, i (project.slug)}
				<ProjectSheet {project} Drawing={drawings[project.slug]} flip={i % 2 === 1} />
			{/each}
		</div>
	</section>
</main>
```

- [ ] **Step 9: Run tests**

Run: `bun run check && bunx playwright test`
Expected: svelte-check 0 errors; all tests in `work.spec.ts` and `hero.spec.ts` pass.

- [ ] **Step 10: Visual check**

Run `bun run dev`, open `http://localhost:5173/#work` in Chrome (Claude in Chrome), scroll through, screenshot each sheet at 1440px and 390px. Fix any clipped labels (adjust SVG text x/y) before committing.

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "feat: selected-work sheets with self-drawing blueprint illustrations" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub"
```

---

### Task 4: Hero, title block and profile photo

**Files:**
- Create: `src/lib/components/TitleBlock.svelte`, `src/lib/components/Hero.svelte`, `static/img/yashal-320.webp`, `static/img/yashal-640.webp`
- Modify: `src/routes/+page.svelte`, `tests/e2e/hero.spec.ts`

**Interfaces:**
- Consumes: `profile` from `$lib/data/site`.
- Produces: `<TitleBlock rows: [string, string][]>` (label/value pairs, mono, bordered) reused by Footer in Task 5; `<Hero />` containing the page's only `h1`.

- [ ] **Step 1: Get the LinkedIn photo**

Using Claude in Chrome (load the chrome-browser skill first): open a new tab at `https://www.linkedin.com/in/yashnaj/`, then run via `javascript_tool`:
```js
[...document.querySelectorAll('img')].filter(i => /profile-displayphoto/.test(i.src)).map(i => i.src)
```
Pick the largest (`..._400_400` or `..._800_800`) URL. Download it:
```bash
mkdir -p "$SCRATCH/photo" && curl -sL "<URL>" -o "$SCRATCH/photo/raw.jpg" && file "$SCRATCH/photo/raw.jpg"
```
Expected: `JPEG image data`. Close the tab. If LinkedIn blocks access, ask Yashal to save the photo to `$SCRATCH/photo/raw.jpg`.

- [ ] **Step 2: Produce duotone WebPs**

```bash
for s in 320 640; do
  magick "$SCRATCH/photo/raw.jpg" -resize ${s}x${s}^ -gravity center -extent ${s}x${s} \
    -colorspace gray -level 4%,96% +level-colors '#0b1f3a','#f2ead8' -quality 82 \
    "static/img/yashal-$s.webp"
done
file static/img/yashal-*.webp && ls -l static/img
```
Expected: two `RIFF ... Web/P image` files, each < 60 KB. Read one with the Read tool to eyeball it.

- [ ] **Step 3: Extend the failing test** — append to `tests/e2e/hero.spec.ts`

```ts
test('hero shows role, pitch, photo and contact actions', async ({ page }) => {
	await page.goto('/');
	const hero = page.getByTestId('hero');
	await expect(hero).toContainText('Full-Stack Product Engineer');
	await expect(hero).toContainText('takes software from zero to the App Store');
	const img = hero.getByRole('img', { name: 'Portrait of Yashal Najeeb' });
	await expect(img).toBeVisible();
	expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
	await expect(hero.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '/Yashal-Najeeb-Resume.pdf');
	await expect(hero.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/YashNaj');
	await expect(hero.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/yashnaj');
	await expect(hero.getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:yashnaj@proton.me');
});

test('PRESS START is shown but disabled in phase 1', async ({ page }) => {
	await page.goto('/');
	const start = page.getByTestId('press-start');
	await expect(start).toHaveAttribute('aria-disabled', 'true');
	await expect(start).toContainText('coming soon');
});
```

- [ ] **Step 4: Run to verify failure**

Run: `bunx playwright test tests/e2e/hero.spec.ts`
Expected: FAIL — `hero` test id not found.

- [ ] **Step 5: Create `src/lib/components/TitleBlock.svelte`**

```svelte
<script lang="ts">
	let { rows }: { rows: [string, string][] } = $props();
</script>

<dl class="grid grid-cols-[auto_1fr] border border-line-dim font-mono text-[11px] tracking-widest uppercase">
	{#each rows as [label, value]}
		<dt class="border-b border-r border-line-dim px-2 py-1 text-paper/70 last-of-type:border-b-0">{label}</dt>
		<dd class="m-0 border-b border-line-dim px-2 py-1 last-of-type:border-b-0">{value}</dd>
	{/each}
</dl>
```

- [ ] **Step 6: Create `src/lib/components/Hero.svelte`**

```svelte
<script lang="ts">
	import { profile } from '$lib/data/site';
	import TitleBlock from './TitleBlock.svelte';

	const actions = [
		{ label: 'Resume', href: profile.resume },
		{ label: 'GitHub', href: profile.github },
		{ label: 'LinkedIn', href: profile.linkedin },
		{ label: 'Email', href: `mailto:${profile.email}` }
	];
</script>

<header data-testid="hero" class="grid gap-10 py-16 md:grid-cols-[1fr_auto] md:items-center md:py-28">
	<div class="min-w-0">
		<p class="font-mono text-xs tracking-[0.3em] text-signal uppercase">Drawing no. YN-001</p>
		<h1 class="mt-4 text-5xl leading-[0.95] font-semibold tracking-tight sm:text-6xl md:text-7xl">
			{profile.name}
		</h1>
		<p class="mt-4 font-mono text-sm text-paper/85">{profile.role}</p>
		<p class="mt-6 max-w-xl text-xl leading-snug md:text-2xl">{profile.pitch}</p>

		<nav aria-label="Contact" class="mt-8 flex flex-wrap gap-3">
			{#each actions as a}
				<a
					href={a.href}
					class="border border-paper px-4 py-2 font-mono text-sm tracking-widest uppercase transition-colors hover:border-signal hover:text-signal"
					>{a.label}</a
				>
			{/each}
		</nav>

		<p
			data-testid="press-start"
			aria-disabled="true"
			class="mt-8 inline-flex items-center gap-2 font-mono text-xs tracking-[0.3em] text-paper/70 uppercase"
		>
			<span class="text-signal motion-safe:animate-pulse">Press start ▸</span> coming soon
		</p>
	</div>

	<div class="mx-auto w-56 md:w-72">
		<div class="relative border border-line-dim p-3">
			<span aria-hidden="true" class="absolute -top-px -left-px h-4 w-4 border-t-2 border-l-2 border-signal"></span>
			<span aria-hidden="true" class="absolute -right-px -bottom-px h-4 w-4 border-r-2 border-b-2 border-signal"></span>
			<img
				src="/img/yashal-640.webp"
				srcset="/img/yashal-320.webp 320w, /img/yashal-640.webp 640w"
				sizes="(min-width: 768px) 288px, 224px"
				width="640"
				height="640"
				alt={profile.photoAlt}
				fetchpriority="high"
				class="block h-auto w-full"
			/>
		</div>
		<div class="mt-3">
			<TitleBlock rows={[['Dwg no.', 'YN-001'], ['Rev', '2026'], ['Loc', profile.location]]} />
		</div>
	</div>
</header>
```

- [ ] **Step 7: Use it in `src/routes/+page.svelte`** — add `import Hero from '$lib/components/Hero.svelte';` and replace the placeholder line `<h1 class="py-24 text-5xl font-semibold">Yashal Najeeb</h1>` with `<Hero />`.

- [ ] **Step 8: Run tests**

Run: `bun run check && bunx playwright test`
Expected: all pass (resume link `href` is only asserted, not fetched, here — the PDF arrives in Task 7).

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: blueprint hero with duotone portrait and contact actions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub"
```

---

### Task 5: Also built, experience, footer and 404 page

**Files:**
- Create: `src/lib/components/AlsoBuilt.svelte`, `src/lib/components/Experience.svelte`, `src/lib/components/Footer.svelte`, `src/routes/+error.svelte`, `tests/e2e/sections.spec.ts`
- Modify: `src/routes/+page.svelte`

**Interfaces:**
- Consumes: `alsoBuilt`, `experience`, `profile` from `$lib/data/site`; `TitleBlock` from Task 4.

- [ ] **Step 1: Write the failing test** `tests/e2e/sections.spec.ts`

```ts
import { expect, test } from '@playwright/test';

test('also built lists four smaller projects', async ({ page }) => {
	await page.goto('/');
	const section = page.locator('#also-built');
	await expect(section.getByRole('heading', { level: 2 })).toHaveText('Also built');
	await expect(section.locator('li strong')).toHaveText(['Serveus', 'Rider365', 'AutoAce', 'FieldDiligence']);
});

test('experience shows three roles, contract client unnamed', async ({ page }) => {
	await page.goto('/');
	const section = page.locator('#experience');
	await expect(section.locator('li')).toHaveCount(3);
	await expect(section).toContainText('Healthcare records platform');
	await expect(section).toContainText('Lead Engineer');
});

test('footer exposes email and links', async ({ page }) => {
	await page.goto('/');
	const footer = page.locator('footer');
	await expect(footer.getByRole('link', { name: 'yashnaj@proton.me' })).toHaveAttribute('href', 'mailto:yashnaj@proton.me');
	await expect(footer).toContainText('© 2026 Yashal Najeeb');
});

test('unknown paths render the blueprint 404 with a way home', async ({ page }) => {
	await page.goto('/does-not-exist');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
	await expect(page.getByRole('link', { name: /back to/i })).toHaveAttribute('href', '/');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bunx playwright test tests/e2e/sections.spec.ts`
Expected: FAIL — `#also-built` not found.

- [ ] **Step 3: Create components**

`src/lib/components/AlsoBuilt.svelte`:
```svelte
<script lang="ts">
	import { alsoBuilt } from '$lib/data/site';
</script>

<section id="also-built" aria-labelledby="also-heading" class="py-16">
	<h2 id="also-heading" class="mb-8 font-mono text-sm tracking-[0.3em] text-paper/80 uppercase">Also built</h2>
	<ul class="grid gap-px border border-line-dim bg-line-dim sm:grid-cols-2">
		{#each alsoBuilt as item}
			<li class="bg-ink p-5">
				<strong class="block text-lg font-semibold">{item.name}</strong>
				<span class="mt-1 block text-paper/85">{item.description}</span>
			</li>
		{/each}
	</ul>
</section>
```

`src/lib/components/Experience.svelte`:
```svelte
<script lang="ts">
	import { experience } from '$lib/data/site';
</script>

<section id="experience" aria-labelledby="exp-heading" class="py-16">
	<h2 id="exp-heading" class="mb-8 font-mono text-sm tracking-[0.3em] text-paper/80 uppercase">Experience</h2>
	<ol class="border-l border-line-dim">
		{#each experience as job}
			<li class="relative pb-10 pl-6 last:pb-0">
				<span aria-hidden="true" class="absolute top-2 -left-[5px] h-2.5 w-2.5 border border-signal bg-ink"></span>
				<p class="font-mono text-xs tracking-widest text-paper/70 uppercase">{job.period} · {job.place}</p>
				<h3 class="mt-1 text-xl font-semibold">{job.role} — {job.org}</h3>
				<p class="mt-2 max-w-2xl text-paper/85">{job.note}</p>
			</li>
		{/each}
	</ol>
</section>
```

`src/lib/components/Footer.svelte`:
```svelte
<script lang="ts">
	import { profile } from '$lib/data/site';
	import TitleBlock from './TitleBlock.svelte';
</script>

<footer class="mt-16 border-t border-line-dim py-12">
	<div class="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
		<div>
			<p class="text-2xl font-semibold">Let’s build something.</p>
			<p class="mt-3 flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm">
				<a class="underline decoration-signal underline-offset-4 hover:text-signal" href="mailto:{profile.email}">{profile.email}</a>
				<a class="hover:text-signal" href={profile.github}>GitHub ↗</a>
				<a class="hover:text-signal" href={profile.linkedin}>LinkedIn ↗</a>
				<a class="hover:text-signal" href={profile.resume}>Resume ↗</a>
			</p>
		</div>
		<TitleBlock rows={[['Drawn by', profile.name], ['Sheet', 'END'], ['©', '2026 Yashal Najeeb']]} />
	</div>
</footer>
```

Note: the footer test asserts text `© 2026 Yashal Najeeb`. The title block renders `©` and `2026 Yashal Najeeb` in separate cells, so also add a visually-hidden line inside `<footer>` after the grid: `<p class="sr-only">© 2026 Yashal Najeeb</p>`.

`src/routes/+error.svelte`:
```svelte
<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} · Yashal Najeeb</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4">
	<p class="font-mono text-xs tracking-[0.3em] text-signal uppercase">Sheet missing</p>
	<h1 class="mt-4 text-6xl font-semibold">{page.status}</h1>
	<p class="mt-4 text-paper/85">This drawing isn’t in the set.</p>
	<a class="mt-8 w-fit border border-paper px-4 py-2 font-mono text-sm tracking-widest uppercase hover:border-signal hover:text-signal" href="/">Back to the main sheet</a>
</main>
```

- [ ] **Step 4: Compose in `src/routes/+page.svelte`** — import `AlsoBuilt`, `Experience`, `Footer` and render, inside `<main>` after the work section: `<AlsoBuilt />` then `<Experience />`; and after `</main>`, wrapped in the same container: `<div class="mx-auto max-w-6xl px-4 md:px-8"><Footer /></div>`.

- [ ] **Step 5: Run tests**

Run: `bun run check && bunx playwright test`
Expected: all pass. (The 404 test works because `vite preview` serves `404.html` from the adapter fallback, which hydrates to `+error.svelte`.) If `vite preview` returns the index instead of the fallback for unknown paths, change the 404 test to `page.goto('/404.html')` and leave a note — Cloudflare's `not_found_handling: "404-page"` (Task 9) is what serves it in production, verified there.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: also-built, experience, footer and 404 page" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub"
```

---

### Task 6: SEO head, favicon, robots and OG image

**Files:**
- Create: `static/favicon.svg`, `static/robots.txt`, `scripts/og.html`, `scripts/make-og.ts`, `static/og.png`
- Modify: `src/routes/+layout.svelte`, `src/routes/+page.svelte` (remove its `<svelte:head>`), `tests/e2e/layout.spec.ts`

**Interfaces:**
- Consumes: `profile` from `$lib/data/site`.

- [ ] **Step 1: Write the failing test** `tests/e2e/layout.spec.ts`

```ts
import { expect, test } from '@playwright/test';

test('head has title, description, canonical, OG and JSON-LD without email', async ({ page, request }) => {
	await page.goto('/');
	await expect(page).toHaveTitle('Yashal Najeeb — Full-Stack Product Engineer');
	await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /zero to the App Store/);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://yashnaj.dev/');
	await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://yashnaj.dev/og.png');
	await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
	const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
	expect(ld['@type']).toBe('Person');
	expect(ld.sameAs).toEqual(['https://github.com/YashNaj', 'https://www.linkedin.com/in/yashnaj']);
	expect(JSON.stringify(ld)).not.toContain('@proton.me');
	const og = await request.get('/og.png');
	expect(og.status()).toBe(200);
	expect(og.headers()['content-type']).toBe('image/png');
	expect((await request.get('/favicon.svg')).status()).toBe(200);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bunx playwright test tests/e2e/layout.spec.ts`
Expected: FAIL — title mismatch.

- [ ] **Step 3: Static files**

`static/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="10" fill="#0b1f3a"/>
  <path d="M6 14V6h8M50 6h8v8M58 50v8h-8M14 58H6v-8" fill="none" stroke="#ff7a3d" stroke-width="3"/>
  <text x="32" y="41" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="22" font-weight="600" fill="#f2ead8">YN</text>
</svg>
```

`static/robots.txt`:
```
User-agent: *
Allow: /
```

- [ ] **Step 4: Head in `src/routes/+layout.svelte`** — replace the file with:

```svelte
<script lang="ts">
	import '@fontsource-variable/inter-tight/wght.css';
	import '@fontsource/ibm-plex-mono/latin-400.css';
	import '@fontsource/ibm-plex-mono/latin-500.css';
	import '../app.css';
	import { profile } from '$lib/data/site';

	let { children } = $props();

	const title = `${profile.name} — Full-Stack Product Engineer`;
	const description = `${profile.pitch} iOS, React Native, SvelteKit, Postgres. Selected work: chauffeur, Myne Global, a mobile MRI/CT viewer and more.`;
	const url = 'https://yashnaj.dev/';
	const jsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: profile.name,
		url,
		jobTitle: 'Full-Stack Product Engineer',
		sameAs: [profile.github, profile.linkedin]
	});
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content="https://yashnaj.dev/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Yashal Najeeb — Full-Stack Product Engineer, drawn as a blueprint title block" />
	<meta name="twitter:card" content="summary_large_image" />
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

{@render children()}
```

Remove `<svelte:head>…</svelte:head>` from `src/routes/+page.svelte`. In `+error.svelte` keep its own `<title>` (Svelte uses the last one).

- [ ] **Step 5: OG image source** `scripts/og.html`

```html
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { margin:0; width:1200px; height:630px; background:#0b1f3a; color:#f2ead8; font-family:'Inter Tight Variable','Inter Tight',system-ui,sans-serif;
    background-image: linear-gradient(rgba(242,234,216,.07) 1px,transparent 1px), linear-gradient(90deg,rgba(242,234,216,.07) 1px,transparent 1px);
    background-size: 48px 48px; position:relative; overflow:hidden; }
  .frame { position:absolute; inset:40px; border:1.5px solid rgba(242,234,216,.45); }
  .k { position:absolute; width:28px; height:28px; border-color:#ff7a3d; border-style:solid; }
  .tl { top:-2px; left:-2px; border-width:3px 0 0 3px } .br { bottom:-2px; right:-2px; border-width:0 3px 3px 0 }
  .eyebrow { position:absolute; left:96px; top:110px; font:500 22px/1 'IBM Plex Mono',monospace; letter-spacing:.3em; color:#ff7a3d; }
  h1 { position:absolute; left:92px; top:150px; margin:0; font-size:120px; line-height:.95; font-weight:600; letter-spacing:-.02em; }
  .role { position:absolute; left:96px; top:420px; font:400 28px/1.3 'IBM Plex Mono',monospace; }
  .tb { position:absolute; right:40px; bottom:40px; display:grid; grid-template-columns:auto auto; border-left:1.5px solid rgba(242,234,216,.45); border-top:1.5px solid rgba(242,234,216,.45); font:500 18px/1 'IBM Plex Mono',monospace; letter-spacing:.15em; }
  .tb div { padding:12px 18px; border-right:1.5px solid rgba(242,234,216,.45); border-bottom:1.5px solid rgba(242,234,216,.45); }
</style>
</head>
<body>
  <div class="frame"><span class="k tl"></span><span class="k br"></span></div>
  <div class="eyebrow">DRAWING NO. YN-001</div>
  <h1>Yashal<br/>Najeeb</h1>
  <div class="role">Full-Stack Product Engineer<br/>iOS · React Native · TypeScript · Postgres</div>
  <div class="tb"><div>SITE</div><div>YASHNAJ.DEV</div><div>REV</div><div>2026</div></div>
</body>
</html>
```

`scripts/make-og.ts`:
```ts
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const src = new URL('./og.html', import.meta.url);
const out = fileURLToPath(new URL('../static/og.png', import.meta.url));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(src.href);
await page.screenshot({ path: out, type: 'png' });
await browser.close();
console.log('wrote', out);
```

Run: `bun scripts/make-og.ts && file static/og.png`
Expected: `PNG image data, 1200 x 630`. View it with the Read tool. (System fonts may stand in for Inter Tight/Plex Mono here; acceptable — if Inter Tight is installed locally it is used.)

- [ ] **Step 6: Run tests**

Run: `bun run check && bunx playwright test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: SEO meta, JSON-LD, favicon and blueprint OG image" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub"
```

---

### Task 7: Redacted resume + confidentiality scan

**Files:**
- Create: `static/Yashal-Najeeb-Resume.pdf`, `tests/unit/confidentiality.test.ts`
- Scratch only (never committed): `$SCRATCH/redact/redact.py`, `$SCRATCH/venv`
- Reads (gitignored, already present): `.confidential-terms`, `.resume-redactions.json`

**Interfaces:**
- Consumes: built `build/` directory (from `bun run build`).

- [ ] **Step 1: Write the failing test** `tests/unit/confidentiality.test.ts`

```ts
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const TERMS_FILE = '.confidential-terms';
const terms = existsSync(TERMS_FILE)
	? readFileSync(TERMS_FILE, 'utf8')
			.split('\n')
			.map((t) => t.trim().toLowerCase())
			.filter(Boolean)
	: [];

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const p = join(dir, name);
		return statSync(p).isDirectory() ? walk(p) : [p];
	});
}

function textOf(file: string): string {
	if (file.endsWith('.pdf')) return execFileSync('pdftotext', [file, '-'], { encoding: 'utf8' });
	if (/\.(png|webp|jpg|woff2?|ico)$/.test(file)) return file; // binary: check the file name only
	return file + '\n' + readFileSync(file, 'utf8');
}

describe.skipIf(terms.length === 0)('confidentiality', () => {
	it('build output exists', () => {
		expect(existsSync('build/index.html')).toBe(true);
	});

	it('no confidential term appears in any built file, file name, or the resume text', () => {
		const hits: string[] = [];
		for (const file of walk('build')) {
			const text = textOf(file).toLowerCase();
			for (const t of terms) if (text.includes(t)) hits.push(`${file}: ${t}`);
		}
		expect(hits).toEqual([]);
	});

	it('the resume is present and still reads as Yashal’s resume', () => {
		const text = execFileSync('pdftotext', ['static/Yashal-Najeeb-Resume.pdf', '-'], { encoding: 'utf8' });
		expect(text).toContain('Yashal Najeeb');
		expect(text).toContain('Healthcare records platform');
		expect(text).toContain('Myne Global');
	});
});

if (terms.length === 0) console.warn('[confidentiality] .confidential-terms missing — scan skipped');
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run build && bunx vitest run tests/unit/confidentiality.test.ts`
Expected: FAIL — `pdftotext` cannot open `static/Yashal-Najeeb-Resume.pdf`.

- [ ] **Step 3: Create the redaction script in scratch (not the repo)**

```bash
python3 -m venv "$SCRATCH/venv" && "$SCRATCH/venv/bin/pip" install -q pymupdf
mkdir -p "$SCRATCH/redact"
```

`$SCRATCH/redact/redact.py`:
```python
import json, sys
import fitz  # PyMuPDF

src, dst, pairs_path = sys.argv[1], sys.argv[2], sys.argv[3]
pairs = json.load(open(pairs_path))
doc = fitz.open(src)
missing = []
for pair in pairs:
    found = False
    for page in doc:
        rects = page.search_for(pair["find"])
        if not rects:
            continue
        found = True
        r = rects[0]
        # capture style of the first span on that line
        size, color = 9.0, (0, 0, 0)
        for b in page.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                for s in l["spans"]:
                    if fitz.Rect(s["bbox"]).intersects(r):
                        size = s["size"]
                        c = s["color"]
                        color = ((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255
        for rr in rects:
            page.add_redact_annot(rr, fill=(1, 1, 1))
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
        page.insert_text((r.x0, r.y1 - size * 0.22), pair["replace"], fontsize=size, fontname="helv", color=color)
    if not found:
        missing.append(pair["find"])
doc.save(dst, garbage=4, deflate=True)
if missing:
    print("NOT FOUND:", missing)
    sys.exit(1)
print("ok")
```

- [ ] **Step 4: Produce the redacted PDF**

```bash
"$SCRATCH/venv/bin/python" -I "$SCRATCH/redact/redact.py" "/Users/Yash/Developer/Yashal Najeeb Resume.pdf" static/Yashal-Najeeb-Resume.pdf .resume-redactions.json
pdftotext -layout static/Yashal-Najeeb-Resume.pdf - | head -40
pdftoppm -png -r 110 -f 1 -l 1 static/Yashal-Najeeb-Resume.pdf "$SCRATCH/redact/page"
```
Expected: `ok`; text shows the replacement lines. Open `$SCRATCH/redact/page-1.png` with the Read tool and check the replaced lines look acceptable (font mismatch is minor; overlapping/clipped text is not). If a `find` string is reported NOT FOUND, run `pdftotext -raw` to see the exact text and fix the pair in `.resume-redactions.json`. **If the result looks bad after one fix attempt, stop and ask Yashal for an edited export instead** (spec fallback).

Confirm the original is untouched: `shasum "/Users/Yash/Developer/Yashal Najeeb Resume.pdf"` before and after — identical.

- [ ] **Step 5: Run tests**

Run: `bun run test`
Expected: unit (site + confidentiality) and all e2e pass. Also run `bunx playwright test -g "hero shows"` — the resume link now resolves; additionally check `curl -sI http://localhost:4173/Yashal-Najeeb-Resume.pdf` during `bun run preview` returns `application/pdf`.

- [ ] **Step 6: Commit** (the PDF only — verify scratch files are not staged)

```bash
git status --short   # must not list .confidential-terms, .resume-redactions.json or any scratch path
git add static/Yashal-Najeeb-Resume.pdf tests/unit/confidentiality.test.ts
git commit -m "feat: publish redacted resume and add confidentiality scan" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub"
```

---

### Task 8: Responsive, keyboard and performance pass

**Files:**
- Modify: `tests/e2e/layout.spec.ts`; any component that fails the new tests

- [ ] **Step 1: Write the failing-if-broken tests** — append to `tests/e2e/layout.spec.ts`

```ts
for (const width of [360, 390, 768, 1440]) {
	test(`no horizontal scroll at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		await page.goto('/');
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBeLessThanOrEqual(0);
	});
}

test('keyboard users reach the contact actions with a visible focus ring', async ({ page }) => {
	await page.goto('/');
	const seen: string[] = [];
	for (let i = 0; i < 6; i++) {
		await page.keyboard.press('Tab');
		const info = await page.evaluate(() => {
			const el = document.activeElement as HTMLElement;
			const cs = getComputedStyle(el);
			return { text: el.textContent?.trim() ?? '', outline: cs.outlineStyle, color: cs.outlineColor };
		});
		seen.push(info.text);
		if (info.text === 'Resume') {
			expect(info.outline).toBe('solid');
			expect(info.color).toBe('rgb(255, 122, 61)');
		}
	}
	expect(seen).toEqual(expect.arrayContaining(['Resume', 'GitHub', 'LinkedIn', 'Email']));
});
```

- [ ] **Step 2: Run**

Run: `bunx playwright test tests/e2e/layout.spec.ts`
Expected: PASS. If the 360px test fails, find the offender with
`page.evaluate(() => [...document.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth).map(e => e.outerHTML.slice(0, 80)))`
and fix it (typical culprits: hero `h1` size → keep `text-5xl` at base; `CopyCommand` → it already has `min-w-0 overflow-x-auto`; SVG text near x=385 → move left).

- [ ] **Step 3: JS budget**

```bash
bun run build
find build/_app -name '*.js' -print0 | xargs -0 cat | gzip -c | wc -c
```
Expected: < 30720 bytes. (This overcounts — it includes chunks for the error page — so if it is over, check the index's actual `modulepreload` list in `build/index.html` and sum only those.)

- [ ] **Step 4: Local Lighthouse**

```bash
bunx vite preview --port 4173 --strictPort &
sleep 2
bunx lighthouse http://localhost:4173/ --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output-path="$SCRATCH/lh-local.json" --chrome-flags="--headless=new" --quiet
node -e 'const r=require(process.argv[1]);for(const[k,v]of Object.entries(r.categories))console.log(k,Math.round(v.score*100))' "$SCRATCH/lh-local.json"
kill %1
```
Expected: all four ≥ 95. If accessibility < 95, read `audits` with score 0 from the JSON and fix (usual: contrast of `text-paper/70` — raise to `/80`). SEO may flag the canonical pointing to a different host locally; ignore only that audit.

- [ ] **Step 5: Visual pass in Chrome** at 390px and 1440px; screenshot hero and one sheet; fix anything ugly.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "test: responsive, keyboard focus and perf checks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub"
```

---

### Task 9: Cloudflare Worker config + workers.dev preview deploy  ⛔ gate

**Files:**
- Create: `wrangler.jsonc`
- Modify: `package.json` (add `deploy` script, `wrangler` devDependency)

- [ ] **Step 1: Add wrangler and config**

```bash
bun add -d wrangler@^4.149.0
```

`wrangler.jsonc`:
```jsonc
{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "yashnaj-landing",
	"compatibility_date": "2026-10-01",
	"assets": {
		"directory": "./build",
		"not_found_handling": "404-page",
		"html_handling": "drop-trailing-slash"
	}
}
```

Add script: `"deploy": "bun run build && wrangler deploy"`.

- [ ] **Step 2: Local Cloudflare runtime check**

```bash
bun run build && bunx wrangler dev --port 8787 &
sleep 4
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8787/
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8787/nope
curl -sI http://localhost:8787/Yashal-Najeeb-Resume.pdf | grep -i content-type
kill %1
```
Expected: `200`, `404`, `content-type: application/pdf`.

- [ ] **Step 3: ⛔ Ask Yashal:** "Ready to deploy the preview to `yashnaj-landing.<subdomain>.workers.dev` (public URL, not linked anywhere). OK?" Wait for yes.

- [ ] **Step 4: Deploy**

Run: `bunx wrangler deploy` (authenticate with `bunx wrangler login` in Chrome if prompted — same device-flow handling as `cf auth login`).
Expected: output with the `*.workers.dev` URL. Record it.

- [ ] **Step 5: Verify remotely**

```bash
URL=<workers.dev url>
curl -s -o /dev/null -w '%{http_code}\n' $URL/ ; curl -s -o /dev/null -w '%{http_code}\n' $URL/nope
bunx lighthouse $URL/ --only-categories=performance,accessibility,best-practices,seo --output=json --output-path="$SCRATCH/lh-preview.json" --chrome-flags="--headless=new" --quiet
node -e 'const r=require(process.argv[1]);for(const[k,v]of Object.entries(r.categories))console.log(k,Math.round(v.score*100))' "$SCRATCH/lh-preview.json"
```
Expected: `200`, `404`, all four scores ≥ 95. Open the URL in Chrome and screenshot for Yashal.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: deploy static build as Cloudflare Worker assets" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub"
```

---

### Task 10: GitHub repo + Workers Builds CI  ⛔ gate

- [ ] **Step 1: Pre-push leak check**

```bash
git grep -iEf .confidential-terms $(git rev-list --all) ; echo "exit=$?"
git ls-files | grep -E 'confidential|redactions' ; echo "exit=$?"
```
Expected: both print nothing and `exit=1`. If anything matches, stop and fix history before pushing.

- [ ] **Step 2: ⛔ Ask Yashal:** "Create `github.com/YashNaj/yashnaj-landing` as **public** (or private?) and push `main`?" Wait for answer.

- [ ] **Step 3: Create and push**

```bash
git branch -M main
gh repo create YashNaj/yashnaj-landing --public --source . --push   # or --private per answer
```

- [ ] **Step 4: Connect Workers Builds** — in Chrome, Cloudflare dashboard → Workers & Pages → `yashnaj-landing` → Settings → Builds → Connect to GitHub repo `YashNaj/yashnaj-landing`, branch `main`, build command `bun run build`, deploy command `bunx wrangler deploy`. (This grants Cloudflare's GitHub app access — ask Yashal to approve the GitHub OAuth screen themselves.)

- [ ] **Step 5: Verify** — push an empty commit (`git commit --allow-empty -m "ci: trigger first Workers Build"` with the trailer lines) and confirm the build succeeds in the dashboard.

---

### Task 11: Custom domain yashnaj.dev  ⛔ gates

- [ ] **Step 1: Record current DNS** (so nothing is lost when nameservers move)

```bash
for t in A AAAA CNAME MX TXT NS CAA; do echo "== $t"; dig +short yashnaj.dev $t; dig +short www.yashnaj.dev $t; done | tee "$SCRATCH/dns-before.txt"
```
Also open Porkbun (Chrome) → Domain Management → yashnaj.dev → DNS, and screenshot the record list. Note any email (MX/SPF/DKIM) or verification TXT records.

- [ ] **Step 2: ⛔ Ask Yashal:** "Add yashnaj.dev as a zone in your Cloudflare account (free plan)?" Wait for yes.

- [ ] **Step 3: Create the zone** — via the Cloudflare MCP server (after `/reload-plugins`) or `cf` (run `cf --help` / `cf zones --help` to find the zone-create command; it maps to `POST /zones` with `{"name":"yashnaj.dev","account":{"id":"ccc8241db73bc822b19ba3da7cdbf953"},"type":"full"}`). Record the two assigned nameservers. Compare Cloudflare's auto-imported DNS records to `$SCRATCH/dns-before.txt`; add any missing MX/TXT records exactly. Remove imported A/AAAA/CNAME records for `@` and `www` that point at Porkbun parking (custom domains will create their own).

- [ ] **Step 4: ⛔ Ask Yashal:** "Change yashnaj.dev nameservers at Porkbun to `<ns1>` and `<ns2>`? Email/other records have been copied to Cloudflare: <list>." Wait for yes.

- [ ] **Step 5: Change nameservers at Porkbun** — Chrome → Porkbun → yashnaj.dev → Authoritative Nameservers → replace with the two Cloudflare nameservers → Save. If Porkbun shows DNSSEC enabled, disable it first (ask Yashal; it's a security setting). Then poll:
```bash
dig +short NS yashnaj.dev @1.1.1.1
```
until both Cloudflare nameservers appear (can take minutes to hours), and confirm the zone shows **Active** in Cloudflare.

- [ ] **Step 6: Attach custom domains** — add to `wrangler.jsonc`:
```jsonc
	"routes": [
		{ "pattern": "yashnaj.dev", "custom_domain": true },
		{ "pattern": "www.yashnaj.dev", "custom_domain": true }
	]
```
⛔ Ask Yashal: "Attach yashnaj.dev and www to the Worker and go live?" On yes: `bunx wrangler deploy`.

- [ ] **Step 7: www → apex redirect** — create a Single Redirect rule on the zone (Cloudflare MCP / `cf`, or dashboard → Rules → Redirect Rules): when `http.host eq "www.yashnaj.dev"`, 301 to `concat("https://yashnaj.dev", http.request.uri.path)`, preserve query string.

- [ ] **Step 8: Final verification**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://yashnaj.dev/
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://www.yashnaj.dev/
curl -s -o /dev/null -w '%{http_code}\n' https://yashnaj.dev/nope
bunx lighthouse https://yashnaj.dev/ --only-categories=performance,accessibility,best-practices,seo --output=json --output-path="$SCRATCH/lh-prod.json" --chrome-flags="--headless=new" --quiet
node -e 'const r=require(process.argv[1]);for(const[k,v]of Object.entries(r.categories))console.log(k,Math.round(v.score*100))' "$SCRATCH/lh-prod.json"
dig +short MX yashnaj.dev   # matches dns-before.txt
```
Expected: `200`; `301 https://yashnaj.dev/`; `404`; all Lighthouse ≥ 95; MX unchanged.

- [ ] **Step 9: Commit**

```bash
git add wrangler.jsonc && git commit -m "chore: serve on yashnaj.dev custom domain" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub" && git push
```
