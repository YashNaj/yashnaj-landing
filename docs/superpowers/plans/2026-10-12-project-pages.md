# Project Pages, Carousel & Live MRI Demo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One prerendered page per hero project, reached through a cross-document View Transition morph from its home sheet, each with a framed image/video carousel and a write-up — plus Yashal's MRI/CT viewer hosted as a live demo.

**Architecture:** New `src/routes/work/[slug]` (prerendered via `entries`, `csr = false`) and `src/routes/work/mri-viewer/demo`. Per-page SEO moves from `+layout.svelte` into a `Seo.svelte` component. Carousel is server-rendered markup + CSS scroll-snap, progressively enhanced by `static/carousel.js` (vanilla). The demo is a static bundle under `static/demo/mri/` embedded in an iframe. Media are generated once by scripts in `scripts/media/` and committed.

**Tech Stack:** existing (SvelteKit 2.70, Svelte 5, Tailwind 4, Bun, Vitest, Playwright, Wrangler) + `ffmpeg`, `ffprobe`, `magick`, `cwebp` (all installed locally).

**Spec:** `docs/superpowers/specs/2026-10-12-project-pages-design.md`

## Global Constraints

- Every route prerendered; `/` and `/work/*` pages use `csr = false`; no client router, no animation library.
- Home page JS unchanged (~1 KB, budget test stays green); project pages ≤ 4 KB gz JS total.
- Lighthouse: home 100s; `/work/*` ≥ 95 all four; demo page ≥ 90 for Accessibility/Best Practices/SEO.
- **Confidentiality:** no term from gitignored `.confidential-terms` in any tracked file, file name, commit message, or built output (including `static/demo/**`, media files, scan index). Never name the demo's local source folder in tracked files — refer to it as `$DEMO_SRC`. Run the leak check as its own step before every commit; never chain it with commit/push. `.git/hooks/pre-commit` and `commit-msg` enforce this — keep them.
- `$DEMO_SRC` = Yashal's local MRI demo folder (path given in the executor's session, not written here). `$SCRATCH` = this session's scratchpad.
- Write-up copy never names the MRI client/agency; it is "a healthcare records platform".
- Reduced motion: no view-transition animation, no carousel smooth scroll, no video autoplay.
- Image slides ≤ 150 KB each (WebP); video slides ≤ 1.3 MB each (H.264 MP4, no audio, `+faststart`).
- Credit on MRI pages: "Sample study: BRAINIX, from the OsiriX / Orthanc public DICOM sample library — for teaching and demonstration."
- Commit trailer on every commit:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub
  ```
- Push to `main` deploys to production (Workers Builds). Push only at the end (Task 9) after review.

## Review Focus

1. **Deep link / refresh on a project page** (no morph, cold load): page must render complete with its own title, canonical and OG tags — not the home page's. Test in Task 6.
2. **Carousel at its ends**: "previous" on slide 1 and "next" on the last slide must not throw or jump; counter stays in range. Test in Task 5.
3. **Viewer can't get WebGL** (old phone, blocked GPU): demo shows the viewer's error text rather than a forever spinner; the project page itself is unaffected. Test in Task 3 (assert overlay text is not stuck on "Loading imaging…" after timeout when WebGL is disabled).
4. **Unknown slug** (`/work/nope`): 404 page with noindex, not a crash. Test in Task 6.
5. **Video slides offscreen**: videos must not download/play until their slide is visible (`preload="none"`, IO-gated play). Test in Task 5.

---

## File Structure

```
src/lib/data/site.ts                 # + Slide type, Project.detail, Project.slides
src/lib/drawings/index.ts            # drawings map (shared by home + work pages)
src/lib/components/Seo.svelte        # per-page <head> (title, description, canonical, OG, optional JSON-LD, noindex)
src/lib/components/Carousel.svelte   # carousel markup
src/lib/components/ProjectSheet.svelte  # + title link, "View project →", view-transition names
src/routes/+layout.svelte            # head moved out → only fonts/css/children
src/routes/+page.svelte              # uses Seo (with JSON-LD) + drawings map
src/routes/+error.svelte             # Seo with noindex
src/routes/work/[slug]/+page.ts      # entries, csr=false, load → {project, prev, next}
src/routes/work/[slug]/+page.svelte  # project page
src/routes/work/mri-viewer/demo/+page.ts / +page.svelte  # live demo page
src/app.css                          # + view transitions, carousel, frames
static/carousel.js                   # carousel enhancement
static/demo/mri/                     # viewer page (index.html), mobile/ bundle, study/ DICOM + index.json
static/media/{myne,chauffeur,mri,hard-pills}/  # generated slides
static/_headers, static/robots.txt, static/sitemap.xml
scripts/media/myne.ts, chauffeur.sh, capture-sites.ts, capture-mri.ts, import-demo.ts
tests/unit/site.test.ts (+), tests/unit/media.test.ts, tests/unit/budget.test.ts (+), tests/unit/confidentiality.test.ts (scans static/demo too — it already walks build/)
tests/e2e/demo.spec.ts, tests/e2e/carousel.spec.ts, tests/e2e/work-pages.spec.ts
```

---

### Task 1: Data model and write-ups

**Files:** Modify `src/lib/data/site.ts`, `tests/unit/site.test.ts`

**Interfaces — Produces:**
```ts
export type SlideFrame = 'phone' | 'browser';
export type Slide =
	| { kind: 'image'; src: string; width: number; height: number; alt: string; caption: string; frame: SlideFrame }
	| { kind: 'video'; src: string; poster: string; width: number; height: number; alt: string; caption: string; frame: SlideFrame }
	| { kind: 'cta'; href: string; label: string; caption: string };
export type ProjectDetail = { problem: string; built: string; how: string; outcome: string };
// Project gains: detail: ProjectDetail; slides: Slide[]; demo?: { href: string; label: string }
```

- [ ] **Step 1: Failing tests** — append to `tests/unit/site.test.ts` inside `describe('site data')`:

```ts
	it('every project has a four-part write-up', () => {
		for (const p of projects) {
			for (const k of ['problem', 'built', 'how', 'outcome'] as const) {
				expect(p.detail[k].length, `${p.slug}.${k}`).toBeGreaterThan(60);
			}
		}
	});

	it('every project has at least three slides with alt text and captions', () => {
		for (const p of projects) {
			expect(p.slides.length, p.slug).toBeGreaterThanOrEqual(3);
			for (const s of p.slides) {
				expect(s.caption.length).toBeGreaterThan(3);
				if (s.kind !== 'cta') expect(s.alt.length).toBeGreaterThan(10);
			}
		}
	});

	it('the MRI project links to the live demo', () => {
		const mri = projects.find((p) => p.slug === 'mri-viewer')!;
		expect(mri.demo?.href).toBe('/work/mri-viewer/demo');
		expect(mri.slides.some((s) => s.kind === 'cta' && s.href === '/work/mri-viewer/demo')).toBe(true);
	});
```

- [ ] **Step 2: Run** `bunx vitest run tests/unit/site.test.ts` — Expected: FAIL (type error / `detail` undefined).

- [ ] **Step 3: Implement.** Add the types above after `export type Link`. Extend `Project` with `detail: ProjectDetail; slides: Slide[]; demo?: { href: string; label: string }`. Add to each project object:

chauffeur:
```ts
		detail: {
			problem:
				'Coding agents can write an iOS app but can’t tell whether it works. Pointed at the Simulator, an agent taps a disabled button and reports “Done” — nothing happened, and it has no way of knowing.',
			built:
				'chauffeur is an MCP server and agent skill, written in Swift, that lets Claude Code, Codex or Cursor drive the iOS Simulator and get the truth back. It installs with Homebrew and ships a doctor command that checks your Xcode setup.',
			how:
				'It hands the agent the screen as an accessibility outline it can reason about, taps through the Simulator’s own input system, then checks what actually changed. A tap that did nothing returns NO EFFECT, one an alert swallowed returns INTERCEPTED, and a crash returns APP CRASHED with the line that caused it.',
			outcome:
				'Benchmarked head to head with Xcode 27’s own MCP server over 180 runs: on Opus it verified 45 of 45 tasks to Xcode’s 39, in under half the turns at roughly a sixth of the cost — and it answered every crash and log task Xcode couldn’t.'
		},
		slides: [
			{ kind: 'video', src: '/media/chauffeur/honest.mp4', poster: '/media/chauffeur/honest.webp', width: 960, height: 540, frame: 'browser', alt: 'Screen recording: an agent taps a disabled button and chauffeur reports NO EFFECT', caption: 'NO EFFECT — the tap changed nothing, and the agent is told so' },
			{ kind: 'video', src: '/media/chauffeur/race.mp4', poster: '/media/chauffeur/race.webp', width: 960, height: 540, frame: 'browser', alt: 'Side-by-side recording of the same task with chauffeur and with Xcode 27’s MCP server', caption: 'Same task, both tools: 5 turns vs 14' },
			{ kind: 'video', src: '/media/chauffeur/crash.mp4', poster: '/media/chauffeur/crash.webp', width: 960, height: 540, frame: 'browser', alt: 'Screen recording: the app crashes and chauffeur reports APP CRASHED with the failing line', caption: 'APP CRASHED — with the line that caused it' }
		],
```
(Width/height are placeholders for the media task: Task 2 Step 6 replaces them with the real encoded dimensions and the media test enforces the match.)

myne:
```ts
		detail: {
			problem:
				'Collectors of watches, bags and other high-value goods had no way to prove they owned an item — or that it wasn’t stolen — when it came time to sell.',
			built:
				'As lead engineer I built Myne end to end: a SvelteKit API on Postgres with row-level security, a SwiftUI iOS app, and Stripe plus StoreKit billing. Owners register items in a private vault, dealers issue Myne Passports at the point of sale, and repair shops log service history with in-app estimate approval.',
			how:
				'Ownership transfers use owner-held keys with escrowed recovery, so the server never reads an item’s private data. Every buyer search is checked against a registry of 16,830 law-enforcement and Interpol stolen-item records. Design specs and API handoffs keep the web, iOS and repair-shop work in step.',
			outcome:
				'$10M+ in registered assets across 1,200 items and 400 collectors. Shifting revenue to dealers signed 12 NYC shops whose 800 passports became verified items in buyers’ vaults in the first quarter, and a proactive audit found and closed two critical privilege-escalation paths the same day.'
		},
		slides: [1, 2, 3, 4, 5].map((n) => ({
			kind: 'image' as const,
			src: `/media/myne/myne-${n}.webp`,
			width: 600,
			height: 1300,
			frame: 'phone' as const,
			alt: `Myne Global iOS app, App Store screenshot ${n} of 5`,
			caption: ['Your vault', 'Item provenance', 'Myne Passport', 'Ownership transfer', 'Stolen-item check'][n - 1]
		})),
```
(Captions are provisional — Task 2 Step 3 rewrites them to describe what each screenshot actually shows.)

mri-viewer:
```ts
		demo: { href: '/work/mri-viewer/demo', label: 'Try the live viewer' },
		detail: {
			problem:
				'Clinicians on a healthcare records platform couldn’t view MRI or CT scans on their phones. The platform’s imaging viewer was a three-year-old fork that predated touch support, so the viewport was dead on mobile.',
			built:
				'Rather than a risky major upgrade that the web and admin apps also depended on, I built a small, modern Cornerstone3D viewport as its own build and moved every control a user touches into native React Native: series chips, a slice scrubber, scroll / window-level / pan tools and reset.',
			how:
				'The app fetches the study’s DICOMweb manifest, parses it into series, and pushes a stack of image IDs into the WebView over a thin message bridge — loadStack, setSlice, setPrimaryTool, reset — and the page reports back ready, stackLoaded, slice or error. Gestures map to tool groups: one finger for the active tool, pinch to zoom, three fingers to scroll.',
			outcome:
				'MRI and CT studies render on device with the first image in under 2 seconds. Alongside it I closed 57 of 68 open UAT defects (all 31 on mobile), rebuilt authorization across 156 API routes to derive privilege from the database, and stood up the platform’s first iOS release path.'
		},
		slides: [
			{ kind: 'image', src: '/media/mri/series.webp', width: 780, height: 1688, frame: 'phone', alt: 'MRI viewer showing an axial brain slice with series chips and a slice scrubber', caption: 'Series chips and a native slice scrubber' },
			{ kind: 'image', src: '/media/mri/volume.webp', width: 780, height: 1688, frame: 'phone', alt: 'MRI viewer on a 100-slice T1 volume, scrolled to the middle of the stack', caption: 'A 100-slice T1 volume, mid-scroll' },
			{ kind: 'image', src: '/media/mri/flair.webp', width: 780, height: 1688, frame: 'phone', alt: 'MRI viewer showing a FLAIR series with the Window tool selected', caption: 'FLAIR series with window/level' },
			{ kind: 'cta', href: '/work/mri-viewer/demo', label: 'Try the live viewer', caption: 'The real viewer, running in your browser' }
		],
```

hard-pills:
```ts
		detail: {
			problem:
				'A writer wanted a blog with real personality — and to run all of it herself, from drafting and scheduling to the mailing list, without calling a developer.',
			built:
				'A pop-art public site with a featured post, ticker, RSS and generated share images, plus a full admin: a TipTap editor with autosave, scheduling and preview, comic-styled banners, a plain-language SEO panel, a media library, submissions, the mailing list, analytics and backups.',
			how:
				'Publishing runs on database triggers, so “publish now” and scheduled posts behave the same way: the new-post email goes out exactly once through a Supabase edge function, and the post is shared to the writer’s linked X and Threads accounts. Social tokens and API keys are encrypted at rest.',
			outcome:
				'Live at hardpillstoswallow.com and run end to end by a non-technical writer — every post, schedule, email and social share happens without a developer in the loop.'
		},
		slides: [
			{ kind: 'image', src: '/media/hard-pills/home.webp', width: 1440, height: 900, frame: 'browser', alt: 'Hard Pills to Swallow home page: pop-art featured post and recent articles', caption: 'Home: featured post, ticker and recent articles' },
			{ kind: 'image', src: '/media/hard-pills/article.webp', width: 1440, height: 900, frame: 'browser', alt: 'A Hard Pills to Swallow article page with a comic-styled banner', caption: 'An article with its comic-styled banner' },
			{ kind: 'image', src: '/media/hard-pills/mobile.webp', width: 780, height: 1688, frame: 'phone', alt: 'Hard Pills to Swallow home page on a phone', caption: 'The same site on a phone' }
		],
```

- [ ] **Step 4: Run** `bunx vitest run tests/unit/site.test.ts && bun run check` — Expected: all site tests PASS; svelte-check 0 errors.
- [ ] **Step 5: Leak check, then commit** — `git diff --cached` after `git add -A`; run `git diff --cached | grep -ciEf .confidential-terms` (expect `0`), then commit `feat: project write-ups and slide data`.

---

### Task 2: Media assets (Myne, chauffeur, Hard Pills)

**Files:** Create `scripts/media/myne.ts`, `scripts/media/chauffeur.sh`, `scripts/media/capture-sites.ts`, `tests/unit/media.test.ts`, `static/media/**`; Modify `src/lib/data/site.ts` (real dims/captions).

**Interfaces — Consumes:** `projects[].slides` (Task 1). **Produces:** files at every non-cta slide `src`/`poster`.

- [ ] **Step 1: Failing test** `tests/unit/media.test.ts`

```ts
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { projects } from '../../src/lib/data/site';

const file = (src: string) => 'static' + src;
const imageDims = (p: string) => execFileSync('magick', ['identify', '-format', '%w %h', p], { encoding: 'utf8' }).trim();
const videoDims = (p: string) =>
	execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=s=x:p=0', p], { encoding: 'utf8' })
		.trim()
		.replace('x', ' ');

describe('slide media', () => {
	for (const p of projects) {
		for (const s of p.slides) {
			if (s.kind === 'cta') continue;
			it(`${p.slug}: ${s.src} exists, matches declared size, and is within budget`, () => {
				expect(existsSync(file(s.src))).toBe(true);
				if (s.kind === 'image') {
					expect(imageDims(file(s.src))).toBe(`${s.width} ${s.height}`);
					expect(statSync(file(s.src)).size).toBeLessThanOrEqual(150 * 1024);
				} else {
					expect(videoDims(file(s.src))).toBe(`${s.width} ${s.height}`);
					expect(statSync(file(s.src)).size).toBeLessThanOrEqual(1.3 * 1024 * 1024);
					expect(existsSync(file(s.poster))).toBe(true);
					expect(statSync(file(s.poster)).size).toBeLessThanOrEqual(150 * 1024);
				}
			});
		}
	}
});
```

- [ ] **Step 2: Run** `bunx vitest run tests/unit/media.test.ts` — Expected: FAIL (files missing). The MRI slides also fail until Task 4 — expected.

- [ ] **Step 3: Myne screenshots** — `scripts/media/myne.ts`:

```ts
// Downloads Myne Global's official App Store screenshots and stores them as WebP.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'static/media/myne';
mkdirSync(OUT, { recursive: true });
const res = await fetch('https://itunes.apple.com/lookup?id=6757202169&country=us');
const app = (await res.json()).results[0];
const urls: string[] = app.screenshotUrls;
for (const [i, url] of urls.entries()) {
	const big = url.replace(/\/[^/]+$/, '/1290x0w.png');
	const png = `${OUT}/myne-${i + 1}.png`;
	writeFileSync(png, Buffer.from(await (await fetch(big)).arrayBuffer()));
	execFileSync('magick', [png, '-resize', '600x', '-quality', '80', `${OUT}/myne-${i + 1}.webp`]);
	execFileSync('rm', [png]);
	console.log(`myne-${i + 1}.webp`, execFileSync('magick', ['identify', '-format', '%w %h %b', `${OUT}/myne-${i + 1}.webp`], { encoding: 'utf8' }));
}
```
Run `bun scripts/media/myne.ts`. View each WebP with the Read tool and rewrite the five Myne captions/alts in `site.ts` to describe what each screenshot actually shows. Set width/height to the printed dims (all five should match).

- [ ] **Step 4: chauffeur videos** — `scripts/media/chauffeur.sh`:

```bash
#!/bin/sh
# Re-encode chauffeur's README demo recordings for the carousel. Usage: scripts/media/chauffeur.sh <chauffeur repo>
set -e
SRC="$1/docs/media"; OUT=static/media/chauffeur
mkdir -p "$OUT"
for n in honest race crash; do
  ffmpeg -y -loglevel error -i "$SRC/$n.mp4" -an -vf "scale=960:-2:flags=lanczos,fps=24" \
    -c:v libx264 -preset slow -crf 30 -pix_fmt yuv420p -movflags +faststart "$OUT/$n.mp4"
  ffmpeg -y -loglevel error -ss 1.5 -i "$OUT/$n.mp4" -frames:v 1 "$OUT/$n.png"
  cwebp -quiet -q 75 "$OUT/$n.png" -o "$OUT/$n.webp" && rm "$OUT/$n.png"
  printf '%s ' "$n"; ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$OUT/$n.mp4"; ls -l "$OUT/$n.mp4" | awk '{print $5}'
done
```
Run `sh scripts/media/chauffeur.sh ~/Developer/repos/chauffeur`. If any MP4 > 1.3 MB, raise `-crf` to 33 for that file. Update the three chauffeur slides' width/height to the printed dims.

- [ ] **Step 5: Hard Pills captures** — `scripts/media/capture-sites.ts`:

```ts
// Captures the public Hard Pills to Swallow site for the carousel.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = 'static/media/hard-pills';
mkdirSync(OUT, { recursive: true });
const webp = (png: string, out: string, width: number) => {
	execFileSync('magick', [png, '-resize', `${width}x`, '-quality', '78', out]);
	execFileSync('rm', [png]);
	console.log(out, execFileSync('magick', ['identify', '-format', '%w %h %b', out], { encoding: 'utf8' }));
};
const browser = await chromium.launch();
const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desk.goto('https://hardpillstoswallow.com', { waitUntil: 'networkidle' });
await desk.screenshot({ path: `${OUT}/home.png` });
webp(`${OUT}/home.png`, `${OUT}/home.webp`, 1440);
const article = await desk.locator('a[href*="/articles/"], a[href*="/post"], main a[href^="/"]').first().getAttribute('href');
await desk.goto(new URL(article!, 'https://hardpillstoswallow.com').href, { waitUntil: 'networkidle' });
await desk.screenshot({ path: `${OUT}/article.png` });
webp(`${OUT}/article.png`, `${OUT}/article.webp`, 1440);
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await phone.goto('https://hardpillstoswallow.com', { waitUntil: 'networkidle' });
await phone.screenshot({ path: `${OUT}/mobile.png` });
webp(`${OUT}/mobile.png`, `${OUT}/mobile.webp`, 780);
await browser.close();
```
Run `bun scripts/media/capture-sites.ts`. View all three images; if a cookie banner or popup covers content, dismiss it in the script (click its close button before screenshotting) and re-run. If any WebP > 150 KB, lower `-quality` to 70 for that file. Update dims in `site.ts`.

- [ ] **Step 6: Run** `bunx vitest run tests/unit/media.test.ts` — Expected: all chauffeur, Myne, Hard Pills cases PASS; the 3 MRI image cases still FAIL (Task 4).
- [ ] **Step 7: Leak check** (`git add -A && git diff --cached --stat`; `git diff --cached --name-only | grep -ciEf .confidential-terms` → `0`) then commit `feat: carousel media for chauffeur, Myne and Hard Pills` (scripts + static/media + site.ts).

---

### Task 3: Host the MRI viewer demo

**Files:** Create `scripts/media/import-demo.ts`, `static/demo/mri/**`, `static/_headers`, `tests/e2e/demo.spec.ts`; Modify `static/robots.txt`, `playwright.config.ts`.

**Interfaces — Produces:** `/demo/mri` serves the viewer page; `#sliceLabel` reads `1 / 22` once the first series loads; chips in `#strip`; overlay `#overlay`.

- [ ] **Step 1: Failing test** `tests/e2e/demo.spec.ts`

```ts
import { expect, test } from '@playwright/test';

test('raw demo loads the first series and renders slice 1 of 22', async ({ page }) => {
	await page.goto('/demo/mri');
	await expect(page).toHaveTitle('MRI/CT Viewer — Demo');
	await expect(page.locator('#sliceLabel')).toHaveText('1 / 22', { timeout: 20000 });
	await expect(page.locator('#overlay')).toBeHidden();
	await expect(page.locator('#strip .chip')).toHaveCount(7);
});

test('switching to the 100-slice series updates the label', async ({ page }) => {
	await page.goto('/demo/mri');
	await expect(page.locator('#sliceLabel')).toHaveText('1 / 22', { timeout: 20000 });
	await page.locator('#strip .chip').nth(6).click();
	await expect(page.locator('#sliceLabel')).toHaveText('1 / 100', { timeout: 20000 });
});

test.describe('without WebGL', () => {
	test.use({ launchOptions: { args: ['--disable-gpu', '--disable-webgl', '--disable-3d-apis'] } });
	test('the demo reports an error instead of spinning forever', async ({ page }) => {
		await page.goto('/demo/mri');
		await page.waitForTimeout(16000);
		await expect(page.locator('#overlay')).not.toHaveText('Loading imaging…');
	});
});

test('raw demo files are not indexed', async ({ request }) => {
	expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /demo/');
});
```

Add to `playwright.config.ts` `use`: `launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }` (software WebGL in headless Chromium).

- [ ] **Step 2: Run** `bunx playwright test tests/e2e/demo.spec.ts` — Expected: FAIL (404).

- [ ] **Step 3: Import script** — `scripts/media/import-demo.ts`:

```ts
// Copies the stripped-down MRI viewer demo into static/demo/mri and makes it site-relative.
// Usage: bun scripts/media/import-demo.ts <demo source folder>
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2];
const OUT = 'static/demo/mri';
mkdirSync(OUT, { recursive: true });
cpSync(join(SRC, 'mobile'), join(OUT, 'mobile'), { recursive: true });
cpSync(join(SRC, 'study'), join(OUT, 'study'), { recursive: true });

const TITLE = 'MRI/CT Viewer — Demo';
const page = readFileSync(join(SRC, 'demo.html'), 'utf8')
	.replace(/<title>[^<]*<\/title>/, `<title>${TITLE}</title>`)
	.replace('src="/mobile/index.html"', 'src="/demo/mri/mobile/index.html"')
	.replace("fetch(BASE + '/study/index.json')", "fetch(BASE + '/demo/mri/study/index.json')");
writeFileSync(join(OUT, 'index.html'), page);

const viewer = join(OUT, 'mobile/index.html');
writeFileSync(viewer, readFileSync(viewer, 'utf8').replace(/<title>[^<]*<\/title>/, '<title>MRI/CT Viewer</title>'));

const manifest = join(OUT, 'study/index.json');
writeFileSync(manifest, readFileSync(manifest, 'utf8').replace(/dicomweb:https?:\/\/[^/"]+\/study\//g, 'dicomweb:/demo/mri/study/'));
console.log('imported to', OUT);
```
Run `bun scripts/media/import-demo.ts "$DEMO_SRC"`. Then verify: `grep -c localhost static/demo/mri/study/index.json` → `0`; `grep -rliEf .confidential-terms static/demo` → no output; `du -sh static/demo/mri` ≈ 71M; `find static/demo -size +25M` → no output.

- [ ] **Step 4: Robots + headers**

`static/robots.txt`:
```
User-agent: *
Allow: /
Disallow: /demo/

Sitemap: https://yashnaj.dev/sitemap.xml
```
`static/_headers`:
```
/demo/mri/study/*
  Cache-Control: public, max-age=31536000, immutable
```

- [ ] **Step 5: Run** `bunx playwright test tests/e2e/demo.spec.ts` — Expected: PASS. If the WebGL tests fail because headless Chromium cannot create a WebGL2 context even with SwiftShader, set `headless: false` for this spec file only via `test.use({ headless: false })` at the top and record a ledger ruling. If the no-WebGL test shows the overlay still reading "Loading imaging…", add a 15 s timeout in `static/demo/mri/index.html`'s `selectSeries` that sets `overlay.textContent = 'This device could not start the 3D viewer (WebGL unavailable).'` unless a `stackLoaded` arrived, and re-run.

- [ ] **Step 6: Leak check** — `git add -A`; `git diff --cached | grep -ciEf .confidential-terms` → `0`; `git diff --cached --name-only | grep -ciEf .confidential-terms` → `0`. Commit `feat: host the MRI/CT viewer demo`.

---

### Task 4: MRI carousel captures

**Files:** Create `scripts/media/capture-mri.ts`, `static/media/mri/{series,volume,flair}.webp`; Modify `site.ts` dims.

- [ ] **Step 1:** The 3 MRI cases in `tests/unit/media.test.ts` are already failing (Task 2) — confirm with `bunx vitest run tests/unit/media.test.ts`.
- [ ] **Step 2: Script** — `scripts/media/capture-mri.ts`:

```ts
// Captures three states of the hosted MRI demo (run `bun run build && bunx vite preview --port 4180` first).
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = 'static/media/mri';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:4180/demo/mri');
const label = page.locator('#sliceLabel');
await label.filter({ hasText: '1 / 22' }).waitFor({ timeout: 30000 });
const shot = async (name: string) => {
	await page.waitForTimeout(800);
	await page.screenshot({ path: `${OUT}/${name}.png` });
	execFileSync('magick', [`${OUT}/${name}.png`, '-quality', '76', `${OUT}/${name}.webp`]);
	execFileSync('rm', [`${OUT}/${name}.png`]);
	console.log(name, execFileSync('magick', ['identify', '-format', '%w %h %b', `${OUT}/${name}.webp`], { encoding: 'utf8' }));
};
await page.locator('#slice').fill('11');
await page.locator('#slice').dispatchEvent('input');
await shot('series');
await page.locator('#strip .chip').nth(6).click();
await label.filter({ hasText: '/ 100' }).waitFor({ timeout: 30000 });
await page.locator('#slice').fill('52');
await page.locator('#slice').dispatchEvent('input');
await shot('volume');
await page.locator('#strip .chip').nth(1).click();
await label.filter({ hasText: '/ 22' }).waitFor({ timeout: 30000 });
await page.locator('#t-wwwc').click();
await page.locator('#slice').fill('12');
await page.locator('#slice').dispatchEvent('input');
await shot('flair');
await browser.close();
```
- [ ] **Step 3: Run** `bun run build && (bunx vite preview --port 4180 --strictPort &) ; sleep 3; bun scripts/media/capture-mri.ts; pkill -f "vite preview --port 4180"`. View the three images (they must show an actual brain slice, not a black viewport). If any > 150 KB, lower quality to 68. Update the three MRI slide dims in `site.ts`.
- [ ] **Step 4: Run** `bunx vitest run` — Expected: all PASS.
- [ ] **Step 5: Leak check, commit** `feat: MRI viewer carousel captures`.

---

### Task 5: Carousel component

**Files:** Create `src/lib/components/Carousel.svelte`, `static/carousel.js`, `tests/e2e/carousel.spec.ts`; Modify `src/app.css`.

**Interfaces — Produces:** `<Carousel slides: Slide[]; label: string />`. DOM contract used by tests and script: `[data-carousel]` root; `[data-track]` focusable scroller; `[data-slide]` per slide (gets `data-active` when current); `[data-prev]`, `[data-next]`, `[data-counter]` (`FIG. 01 / 05`), `[data-dot]` buttons with `aria-current`; `[data-controls]` hidden until the script runs.

Tests in this task run against `/work/myne` and `/work/chauffeur`, which exist only after Task 6. **Do Task 6 Steps 3–5 (route + page) first if needed, or write this task's component and test, then run the tests at the end of Task 6.** Ruling expected in ledger.

- [ ] **Step 1: Failing tests** `tests/e2e/carousel.spec.ts`

```ts
import { expect, test } from '@playwright/test';

test('buttons, keys and dots move the active slide and counter', async ({ page }) => {
	await page.goto('/work/myne');
	const c = page.locator('[data-carousel]');
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 01 / 05');
	await c.locator('[data-next]').click();
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 02 / 05');
	await c.locator('[data-track]').focus();
	await page.keyboard.press('ArrowRight');
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 03 / 05');
	await c.locator('[data-dot]').nth(4).click();
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 05 / 05');
	await expect(c.locator('[data-dot]').nth(4)).toHaveAttribute('aria-current', 'true');
});

test('ends are clamped: prev on first and next on last stay put without errors', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto('/work/myne');
	const c = page.locator('[data-carousel]');
	await c.locator('[data-prev]').click();
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 01 / 05');
	await c.locator('[data-dot]').nth(4).click();
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 05 / 05');
	await c.locator('[data-next]').click();
	await page.waitForTimeout(500);
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 05 / 05');
	expect(errors).toEqual([]);
});

test('without JS every slide is present and controls stay hidden', async ({ browser }) => {
	const ctx = await browser.newContext({ javaScriptEnabled: false });
	const page = await ctx.newPage();
	await page.goto('/work/myne');
	await expect(page.locator('[data-slide]')).toHaveCount(5);
	await expect(page.locator('[data-controls]')).toBeHidden();
	await ctx.close();
});

test('videos do not load until their slide is visible, then play', async ({ page }) => {
	await page.goto('/work/chauffeur');
	const videos = page.locator('[data-carousel] video');
	await expect(videos.nth(2)).toHaveAttribute('preload', 'none');
	expect(await videos.nth(2).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
	await page.locator('[data-carousel]').scrollIntoViewIfNeeded();
	await expect.poll(() => videos.nth(0).evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 5000 }).toBe(true);
	expect(await videos.nth(2).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});

test('reduced motion: videos never autoplay and show controls', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/work/chauffeur');
	await page.locator('[data-carousel]').scrollIntoViewIfNeeded();
	await page.waitForTimeout(800);
	const v = page.locator('[data-carousel] video').first();
	expect(await v.evaluate((el: HTMLVideoElement) => el.paused)).toBe(true);
	await expect(v).toHaveAttribute('controls', '');
});

test('carousel does not cause horizontal page overflow at 360px', async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 800 });
	await page.goto('/work/hard-pills');
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
	expect(overflow).toBeLessThanOrEqual(0);
	const offenders = await page.evaluate(() =>
		[...document.querySelectorAll('body *')]
			.filter((el) => !el.closest('[data-track], [aria-hidden="true"], .sr-only, svg'))
			.filter((el) => el.getBoundingClientRect().right > window.innerWidth + 0.5)
			.map((el) => el.outerHTML.slice(0, 80))
	);
	expect(offenders).toEqual([]);
});
```

- [ ] **Step 2: Component** `src/lib/components/Carousel.svelte`

```svelte
<script lang="ts">
	import type { Slide } from '$lib/data/site';

	let { slides, label }: { slides: Slide[]; label: string } = $props();
	const pad = (n: number) => String(n).padStart(2, '0');
</script>

<section class="carousel" data-carousel aria-roledescription="carousel" aria-label={label}>
	<div class="carousel-track" data-track tabindex="0" aria-label="{label} — use arrow keys to browse">
		{#each slides as slide, i}
			<figure class="slide" data-slide role="group" aria-roledescription="slide" aria-label="{i + 1} of {slides.length}">
				{#if slide.kind === 'cta'}
					<a class="frame frame-cta" href={slide.href}>
						<span class="font-mono text-xs tracking-[0.3em] text-signal uppercase">Live demo</span>
						<span class="mt-3 block text-2xl font-semibold">{slide.label} →</span>
					</a>
				{:else}
					<div class="frame frame-{slide.frame}">
						{#if slide.frame === 'browser'}
							<div class="frame-bar" aria-hidden="true"><i></i><i></i><i></i></div>
						{/if}
						{#if slide.kind === 'image'}
							<img src={slide.src} alt={slide.alt} width={slide.width} height={slide.height} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
						{:else}
							<video src={slide.src} poster={slide.poster} width={slide.width} height={slide.height} aria-label={slide.alt} muted playsinline loop preload="none"></video>
						{/if}
					</div>
				{/if}
				<figcaption class="mt-4 font-mono text-xs tracking-wider text-paper/80">
					<span class="text-signal">FIG. {pad(i + 1)}</span> — {slide.caption}
				</figcaption>
			</figure>
		{/each}
	</div>
	<div class="carousel-controls" data-controls hidden>
		<button type="button" data-prev aria-label="Previous slide">←</button>
		<span data-counter class="font-mono text-xs tracking-[0.25em]">FIG. 01 / {pad(slides.length)}</span>
		<span class="flex gap-2">
			{#each slides as _, i}
				<button type="button" data-dot aria-label="Go to slide {i + 1}" aria-current={i === 0 ? 'true' : 'false'}></button>
			{/each}
		</span>
		<button type="button" data-next aria-label="Next slide">→</button>
	</div>
</section>
```

- [ ] **Step 3: Script** `static/carousel.js`

```js
(() => {
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const pad = (n) => String(n).padStart(2, '0');
	document.querySelectorAll('[data-carousel]').forEach((root) => {
		const track = root.querySelector('[data-track]');
		const slides = [...root.querySelectorAll('[data-slide]')];
		const counter = root.querySelector('[data-counter]');
		const dots = [...root.querySelectorAll('[data-dot]')];
		let active = 0;
		root.querySelector('[data-controls]').hidden = false;
		root.classList.add('is-enhanced');
		if (reduce) root.querySelectorAll('video').forEach((v) => (v.controls = true));

		const go = (i) => {
			const s = slides[Math.max(0, Math.min(slides.length - 1, i))];
			track.scrollTo({ left: s.offsetLeft - (track.clientWidth - s.clientWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
		};
		const setActive = (i) => {
			active = i;
			counter.textContent = `FIG. ${pad(i + 1)} / ${pad(slides.length)}`;
			dots.forEach((d, j) => d.setAttribute('aria-current', String(j === i)));
			slides.forEach((s, j) => s.toggleAttribute('data-active', j === i));
		};
		root.querySelector('[data-prev]').addEventListener('click', () => go(active - 1));
		root.querySelector('[data-next]').addEventListener('click', () => go(active + 1));
		dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
		track.addEventListener('keydown', (e) => {
			if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
				e.preventDefault();
				go(active + (e.key === 'ArrowRight' ? 1 : -1));
			}
		});
		let onScreen = false;
		const sync = () =>
			slides.forEach((s, j) => {
				const v = s.querySelector('video');
				if (!v) return;
				if (onScreen && j === active && !reduce) v.play().catch(() => {});
				else v.pause();
			});
		new IntersectionObserver(
			([e]) => {
				onScreen = e.isIntersecting;
				sync();
			},
			{ threshold: 0.25 }
		).observe(root);
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) if (e.intersectionRatio >= 0.6) setActive(slides.indexOf(e.target));
				sync();
			},
			{ root: track, threshold: [0, 0.6] }
		);
		slides.forEach((s) => io.observe(s));
		setActive(0);
	});
})();
```
Videos play only when their slide is active **and** the carousel is at least 25% on screen (`onScreen`), otherwise pause.

- [ ] **Step 4: CSS** — append to `src/app.css`:

```css
/* ---------- Carousel ---------- */
.carousel-track {
	display: flex;
	gap: 2rem;
	overflow-x: auto;
	scroll-snap-type: x mandatory;
	padding: 1rem max(1rem, calc(50% - 190px)) 1.5rem;
	scrollbar-width: none;
	overscroll-behavior-x: contain;
}
.carousel-track::-webkit-scrollbar { display: none; }
.slide { flex: 0 0 auto; margin: 0; scroll-snap-align: center; transition: transform 450ms cubic-bezier(0.2, 0.7, 0.2, 1), opacity 450ms; }
html.js .is-enhanced .slide:not([data-active]) { transform: scale(0.94); opacity: 0.55; }
.frame { position: relative; border: 1px solid var(--color-line-dim); background: var(--color-ink-2); overflow: hidden; }
.frame img, .frame video { display: block; width: 100%; height: auto; }
.frame-phone { width: min(72vw, 300px); border-radius: 36px; padding: 10px; }
.frame-phone img, .frame-phone video { border-radius: 26px; }
.frame-browser { width: min(86vw, 760px); border-radius: 10px; }
.frame-bar { display: flex; gap: 6px; padding: 10px 12px; border-bottom: 1px solid var(--color-line-dim); }
.frame-bar i { width: 9px; height: 9px; border-radius: 50%; border: 1px solid var(--color-line-dim); }
.frame-cta { display: flex; flex-direction: column; justify-content: center; width: min(72vw, 300px); aspect-ratio: 9 / 19.5; border-radius: 36px; padding: 2rem; border-color: var(--color-signal); text-decoration: none; }
.frame-cta:hover { background: rgb(255 122 61 / 0.08); }
.carousel-controls { display: flex; align-items: center; justify-content: center; gap: 1.25rem; margin-top: 0.5rem; }
.carousel-controls[hidden] { display: none; }
.carousel-controls > button { border: 1px solid var(--color-line-dim); padding: 0.35rem 0.8rem; font-family: var(--font-mono); }
.carousel-controls > button:hover { border-color: var(--color-signal); color: var(--color-signal); }
[data-dot] { width: 8px; height: 8px; border: 1px solid var(--color-paper); border-radius: 50%; }
[data-dot][aria-current='true'] { background: var(--color-signal); border-color: var(--color-signal); }
@media (prefers-reduced-motion: reduce) { .slide { transition: none; } }
```

- [ ] **Step 5:** Run after Task 6 Step 5: `bunx playwright test tests/e2e/carousel.spec.ts` — Expected: PASS.
- [ ] **Step 6: Leak check, commit** `feat: blueprint carousel with framed slides`.

---

### Task 6: Per-page SEO, project pages, sitemap

**Files:** Create `src/lib/components/Seo.svelte`, `src/lib/drawings/index.ts`, `src/routes/work/[slug]/+page.ts`, `src/routes/work/[slug]/+page.svelte`, `tests/e2e/work-pages.spec.ts`; Modify `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `src/routes/+error.svelte`, `static/sitemap.xml`, `tests/unit/budget.test.ts`.

**Interfaces — Produces:** `<Seo title description path image? jsonLd? noindex? />`; `drawings: Record<ProjectSlug, Component>` from `$lib/drawings`; route `/work/<slug>` with `data: { project: Project; prev: Project; next: Project }`.

- [ ] **Step 1: Failing tests** `tests/e2e/work-pages.spec.ts`

```ts
import { expect, test } from '@playwright/test';

const slugs = ['chauffeur', 'myne', 'mri-viewer', 'hard-pills'];

for (const slug of slugs) {
	test(`/work/${slug} renders with its own head`, async ({ page }) => {
		await page.goto(`/work/${slug}`);
		await expect(page.locator('h1')).toHaveCount(1);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://yashnaj.dev/work/${slug}`);
		await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `https://yashnaj.dev/work/${slug}`);
		await expect(page).toHaveTitle(/ — Yashal Najeeb$/);
		for (const h of ['The problem', 'What I built', 'How it works', 'Outcome']) {
			await expect(page.getByRole('heading', { level: 2, name: h })).toBeVisible();
		}
		await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
		await expect(page.getByRole('link', { name: /All work/ })).toHaveAttribute('href', '/#work');
	});
}

test('prev/next links cycle through the projects', async ({ page }) => {
	await page.goto('/work/chauffeur');
	await expect(page.getByRole('link', { name: /Next: Myne Global/ })).toHaveAttribute('href', '/work/myne');
	await expect(page.getByRole('link', { name: /Previous: Hard Pills to Swallow/ })).toHaveAttribute('href', '/work/hard-pills');
});

test('unknown project slug is a noindex 404', async ({ page }) => {
	const res = await page.goto('/work/nope');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

test('home keeps its JSON-LD and canonical', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://yashnaj.dev/');
	await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
});

test('sitemap lists every project page and the demo', async ({ request }) => {
	const xml = await (await request.get('/sitemap.xml')).text();
	for (const slug of slugs) expect(xml).toContain(`<loc>https://yashnaj.dev/work/${slug}</loc>`);
	expect(xml).toContain('<loc>https://yashnaj.dev/work/mri-viewer/demo</loc>');
});
```
Append to `tests/unit/budget.test.ts`:
```ts
describe('project page JS budget', () => {
	it('each /work page ships under 4 KB gzipped JS', () => {
		for (const slug of ['chauffeur', 'myne', 'mri-viewer', 'hard-pills']) {
			const html = readFileSync(`build/work/${slug}.html`, 'utf8');
			const urls = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
			let total = gzipSync(html.match(/<script>[\s\S]*?<\/script>/g)?.join('') ?? '').length;
			for (const u of urls) total += gzipSync(readFileSync(join('build', u.replace(/^\.?\//, '')))).length;
			expect(total, slug).toBeLessThan(4 * 1024);
		}
	});
});
```

- [ ] **Step 2: Run** `bunx playwright test tests/e2e/work-pages.spec.ts` — Expected: FAIL (404s).

- [ ] **Step 3: Seo component** `src/lib/components/Seo.svelte`

```svelte
<script lang="ts">
	let {
		title,
		description,
		path,
		image = 'https://yashnaj.dev/og.png',
		imageAlt = 'Yashal Najeeb — Full-Stack Product Engineer, drawn as a blueprint title block',
		jsonLd,
		noindex = false
	}: { title: string; description: string; path: string; image?: string; imageAlt?: string; jsonLd?: object; noindex?: boolean } = $props();
	const url = `https://yashnaj.dev${path}`;
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	{#if noindex}<meta name="robots" content="noindex" />{:else}<link rel="canonical" href={url} />{/if}
	<meta property="og:type" content="website" />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={image} />
	<meta property="og:image:alt" content={imageAlt} />
	<meta name="twitter:card" content="summary_large_image" />
	{#if jsonLd}{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}{/if}
</svelte:head>
```

`src/routes/+layout.svelte` becomes (Google verification stays global):
```svelte
<script lang="ts">
	import '@fontsource-variable/inter-tight/wght.css';
	import '@fontsource/ibm-plex-mono/latin-400.css';
	import '@fontsource/ibm-plex-mono/latin-500.css';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<meta name="google-site-verification" content="DpRDN8S4C7lxB8omOBLxNdOBkkvq0gNEBsFw-Q4748M" />
</svelte:head>

{@render children()}
```
In `src/routes/+page.svelte` add, before `<main>`:
```svelte
<Seo
	title="Yashal Najeeb — Full-Stack Product Engineer"
	description="Yashal Najeeb is a full-stack product engineer (iOS, React Native, SvelteKit, Postgres) who takes products from zero to the App Store. Selected work: chauffeur, Myne Global, a mobile MRI/CT viewer and more."
	path="/"
	jsonLd={{ '@context': 'https://schema.org', '@type': 'Person', name: profile.name, alternateName: ['Yash Najeeb', 'yashnaj'], url: 'https://yashnaj.dev/', image: 'https://yashnaj.dev/img/yashal-460.webp', jobTitle: 'Full-Stack Product Engineer', sameAs: [profile.github, profile.linkedin] }}
/>
```
(import `Seo` and `profile`), and replace the local `drawings` map with `import { drawings } from '$lib/drawings';`.
In `+error.svelte` add `<Seo title="{page.status} · Yashal Najeeb" description="This page isn’t in the set." path={page.url.pathname} noindex />` and remove its own `<svelte:head><title>`.

`src/lib/drawings/index.ts`:
```ts
import type { Component } from 'svelte';
import type { ProjectSlug } from '$lib/data/site';
import ComicPanels from './ComicPanels.svelte';
import PassportVault from './PassportVault.svelte';
import PhoneNoEffect from './PhoneNoEffect.svelte';
import ScanSlices from './ScanSlices.svelte';

export const drawings: Record<ProjectSlug, Component> = {
	chauffeur: PhoneNoEffect,
	myne: PassportVault,
	'mri-viewer': ScanSlices,
	'hard-pills': ComicPanels
};
```

- [ ] **Step 4: Route** `src/routes/work/[slug]/+page.ts`

```ts
import { error } from '@sveltejs/kit';
import { projects } from '$lib/data/site';
import type { EntryGenerator, PageLoad } from './$types';

export const csr = false;
export const entries: EntryGenerator = () => projects.map((p) => ({ slug: p.slug }));

export const load: PageLoad = ({ params }) => {
	const i = projects.findIndex((p) => p.slug === params.slug);
	if (i < 0) error(404, 'Not found');
	const n = projects.length;
	return { project: projects[i], prev: projects[(i + n - 1) % n], next: projects[(i + 1) % n] };
};
```

`src/routes/work/[slug]/+page.svelte`
```svelte
<script lang="ts">
	import Carousel from '$lib/components/Carousel.svelte';
	import DrawOnView from '$lib/components/DrawOnView.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { drawings } from '$lib/drawings';

	let { data } = $props();
	const p = $derived(data.project);
	const Drawing = $derived(drawings[p.slug]);
	const sections = $derived([
		['The problem', p.detail.problem],
		['What I built', p.detail.built],
		['How it works', p.detail.how],
		['Outcome', p.detail.outcome]
	]);
</script>

<Seo title="{p.title} — Yashal Najeeb" description="{p.tagline} {p.metric}" path="/work/{p.slug}" />
<svelte:head>
	<script src="/enhance.js" defer></script>
	<script src="/carousel.js" defer></script>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-16">
	<a href="/#work" class="font-mono text-xs tracking-[0.3em] text-paper/80 uppercase hover:text-signal">← All work</a>

	<header class="relative mt-6 grid gap-8 border border-line-dim bg-ink/70 p-5 md:grid-cols-2 md:items-center md:p-10" style:view-transition-name="sheet-{p.slug}">
		<span class="absolute top-3 right-4 font-mono text-xs tracking-widest text-paper/70" style:view-transition-name="sheetno-{p.slug}">SHEET {p.sheet} / 04</span>
		<div style:view-transition-name="drawing-{p.slug}">
			<DrawOnView label={p.drawingLabel}><Drawing /></DrawOnView>
		</div>
		<div class="min-w-0">
			<h1 class="text-4xl font-semibold tracking-tight md:text-5xl" style:view-transition-name="title-{p.slug}">{p.title}</h1>
			<p class="mt-2 font-mono text-sm text-paper/80">{p.tagline}</p>
			<p class="mt-5 border-l-2 border-signal pl-3 font-mono text-sm">{p.metric}</p>
			<ul class="mt-5 flex flex-wrap gap-2" aria-label="Stack">
				{#each p.stack as tech}<li class="border border-line-dim px-2 py-0.5 font-mono text-xs tracking-wider uppercase">{tech}</li>{/each}
			</ul>
			<p class="mt-6 flex flex-wrap gap-4 font-mono text-sm">
				{#if p.demo}<a class="border border-signal px-4 py-2 tracking-widest text-signal uppercase hover:bg-signal hover:text-ink" href={p.demo.href}>{p.demo.label} →</a>{/if}
				{#each p.links as link}<a class="self-center underline decoration-signal underline-offset-4 hover:text-signal" href={link.href}>{link.label} ↗</a>{/each}
			</p>
		</div>
	</header>

	<section class="py-12" aria-labelledby="gallery-heading">
		<h2 id="gallery-heading" class="sr-only">Gallery</h2>
		<Carousel slides={p.slides} label="{p.title} gallery" />
	</section>

	<div class="grid gap-10 md:grid-cols-2">
		{#each sections as [heading, body]}
			<section>
				<h2 class="font-mono text-sm tracking-[0.3em] text-signal uppercase">{heading}</h2>
				<p class="mt-3 text-lg leading-relaxed text-paper/90">{body}</p>
			</section>
		{/each}
	</div>

	{#if p.slug === 'mri-viewer'}
		<p class="mt-10 font-mono text-xs text-paper/70">Sample study: BRAINIX, from the OsiriX / Orthanc public DICOM sample library — for teaching and demonstration.</p>
	{/if}

	<nav class="mt-16 flex flex-wrap justify-between gap-4 border-t border-line-dim pt-8 font-mono text-sm" aria-label="More projects">
		<a class="hover:text-signal" href="/work/{data.prev.slug}">← Previous: {data.prev.title}</a>
		<a class="hover:text-signal" href="/work/{data.next.slug}">Next: {data.next.title} →</a>
	</nav>
	<Footer />
</main>
```

- [ ] **Step 5: Sitemap** — replace `static/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
	<url><loc>https://yashnaj.dev/</loc><lastmod>2026-10-12</lastmod></url>
	<url><loc>https://yashnaj.dev/work/chauffeur</loc><lastmod>2026-10-12</lastmod></url>
	<url><loc>https://yashnaj.dev/work/myne</loc><lastmod>2026-10-12</lastmod></url>
	<url><loc>https://yashnaj.dev/work/mri-viewer</loc><lastmod>2026-10-12</lastmod></url>
	<url><loc>https://yashnaj.dev/work/hard-pills</loc><lastmod>2026-10-12</lastmod></url>
	<url><loc>https://yashnaj.dev/work/mri-viewer/demo</loc><lastmod>2026-10-12</lastmod></url>
</urlset>
```

- [ ] **Step 6: Run** `bun run test && bun run check` — Expected: all PASS (work-pages, carousel from Task 5, budget, existing). The old `layout.spec.ts` head test still passes because home keeps the same title/description/canonical/OG/JSON-LD.
- [ ] **Step 7: Leak check, commit** `feat: per-project pages with per-page SEO`.

---

### Task 7: Home → project morph

**Files:** Modify `src/lib/components/ProjectSheet.svelte`, `src/app.css`; Create test in `tests/e2e/work-pages.spec.ts`.

- [ ] **Step 1: Failing tests** — append to `tests/e2e/work-pages.spec.ts`:

```ts
test('each home sheet links to its page and shares view-transition names with it', async ({ page }) => {
	for (const slug of slugs) {
		await page.goto('/');
		const sheet = page.locator(`#${slug}`);
		const names = await sheet.evaluate((el) =>
			[el, ...el.querySelectorAll('*')].map((n) => getComputedStyle(n).viewTransitionName).filter((n) => n && n !== 'none').sort()
		);
		expect(names).toEqual([`drawing-${slug}`, `sheet-${slug}`, `sheetno-${slug}`, `title-${slug}`]);
		await sheet.getByRole('link', { name: /View project/ }).click();
		await expect(page).toHaveURL(`/work/${slug}`);
		const target = await page.evaluate(() =>
			[...document.querySelectorAll('*')].map((n) => getComputedStyle(n).viewTransitionName).filter((n) => n && n !== 'none').sort()
		);
		expect(target).toEqual(names);
	}
});

test('cross-document view transitions are enabled and disabled for reduced motion', async ({ page }) => {
	await page.goto('/');
	const css = await page.evaluate(() => [...document.styleSheets].flatMap((s) => [...s.cssRules].map((r) => r.cssText)).join('\n'));
	expect(css).toMatch(/@view-transition\s*\{\s*navigation:\s*auto/);
	expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*::view-transition-group\(\*\)[\s\S]*animation: (none|auto ease 0s 1 normal none running none)/);
});
```

- [ ] **Step 2: Run** — Expected: FAIL (no names, no link).

- [ ] **Step 3: ProjectSheet** — on the `<article>` add `style:view-transition-name="sheet-{project.slug}"`; on the SHEET span add `style:view-transition-name="sheetno-{project.slug}"`; wrap `<DrawOnView …>` in `<div style:view-transition-name="drawing-{project.slug}" class={flip ? 'md:order-2' : ''}>` (move the `class` from DrawOnView to the wrapper); change the `<h3>` content to `<a href="/work/{project.slug}" class="hover:text-signal" style:view-transition-name="title-{project.slug}">{project.title}</a>`; after the links paragraph add:

```svelte
		<p class="mt-6">
			<a href="/work/{project.slug}" class="inline-block border border-paper px-4 py-2 font-mono text-sm tracking-widest uppercase hover:border-signal hover:text-signal">View project →</a>
		</p>
```

- [ ] **Step 4: CSS** — append to `src/app.css`:

```css
/* ---------- Cross-document morph ---------- */
@view-transition { navigation: auto; }
::view-transition-group(*) { animation-duration: 380ms; animation-timing-function: cubic-bezier(0.2, 0.7, 0.2, 1); }
@media (prefers-reduced-motion: reduce) {
	::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none; }
}
```

- [ ] **Step 5: Run** `bun run test` — Expected: all PASS (home sheet tests in `work.spec.ts` still pass: h3 text unchanged). Visual check in Chrome: click a sheet title, watch the morph; press Back.
- [ ] **Step 6: Leak check, commit** `feat: morph home sheets into project pages`.

---

### Task 8: Live demo page

**Files:** Create `src/routes/work/mri-viewer/demo/+page.ts`, `+page.svelte`; append tests to `tests/e2e/demo.spec.ts`.

- [ ] **Step 1: Failing tests** — append to `tests/e2e/demo.spec.ts`:

```ts
test('demo page embeds the viewer, credits the dataset and links back', async ({ page }) => {
	await page.goto('/work/mri-viewer/demo');
	await expect(page.locator('h1')).toHaveText('MRI/CT viewer — live demo');
	await expect(page.getByText('Sample study: BRAINIX')).toBeVisible();
	await expect(page.getByRole('link', { name: /Back to the project/ })).toHaveAttribute('href', '/work/mri-viewer');
	const frame = page.frameLocator('iframe[title="MRI/CT viewer demo"]');
	await expect(frame.locator('#sliceLabel')).toHaveText('1 / 22', { timeout: 20000 });
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://yashnaj.dev/work/mri-viewer/demo');
});

test('demo page is full-bleed on phones', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/work/mri-viewer/demo');
	const box = await page.locator('iframe[title="MRI/CT viewer demo"]').boundingBox();
	expect(box!.width).toBeGreaterThanOrEqual(380);
});
```

- [ ] **Step 2: Run** — Expected: FAIL (404).

- [ ] **Step 3: Implement** `src/routes/work/mri-viewer/demo/+page.ts`: `export const csr = false;`

`src/routes/work/mri-viewer/demo/+page.svelte`:
```svelte
<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
</script>

<Seo title="MRI/CT viewer, live demo — Yashal Najeeb" description="Try the mobile MRI/CT viewer Yashal Najeeb built with Cornerstone3D: series, slice scrubbing, window/level and pan, running in your browser." path="/work/mri-viewer/demo" />

<main class="mx-auto flex max-w-6xl flex-col gap-6 px-0 py-6 md:flex-row md:items-start md:gap-12 md:px-8 md:py-12">
	<div class="px-4 md:w-80 md:px-0">
		<a href="/work/mri-viewer" class="font-mono text-xs tracking-[0.3em] text-paper/80 uppercase hover:text-signal">← Back to the project</a>
		<h1 class="mt-4 text-3xl font-semibold tracking-tight">MRI/CT viewer — live demo</h1>
		<p class="mt-3 text-paper/85">Pick a series, drag the scrubber, and switch between Scroll, Window and Pan. On a phone, pinch to zoom.</p>
		<p class="mt-4 font-mono text-xs text-paper/70">Sample study: BRAINIX, from the OsiriX / Orthanc public DICOM sample library — for teaching and demonstration.</p>
		<p class="mt-4 font-mono text-xs text-paper/70">Loads ~6 MB of viewer code plus scan slices as you browse.</p>
	</div>
	<div class="demo-frame">
		<iframe src="/demo/mri" title="MRI/CT viewer demo" loading="eager"></iframe>
	</div>
</main>

<style>
	.demo-frame { width: 100%; height: calc(100dvh - 12rem); min-height: 560px; background: #000; }
	.demo-frame iframe { width: 100%; height: 100%; border: 0; display: block; }
	@media (min-width: 768px) {
		.demo-frame { width: 390px; height: 844px; max-height: calc(100dvh - 6rem); border: 1px solid var(--color-line-dim); border-radius: 44px; padding: 12px; }
		.demo-frame iframe { border-radius: 32px; }
	}
</style>
```

- [ ] **Step 4: Run** `bun run test` — Expected: all PASS.
- [ ] **Step 5: Leak check, commit** `feat: live MRI/CT viewer demo page`.

---

### Task 9: Review, verify, deploy

- [ ] **Step 1:** `bun run test && bun run check` → all PASS; build output scan: `bunx vitest run tests/unit/confidentiality.test.ts` → PASS (it walks all of `build/`, including `build/demo/**` and media).
- [ ] **Step 2:** Final whole-branch review by a fresh reviewer (executing-plans skill), with this plan's Review Focus; fix Critical/Important with RED→GREEN tests.
- [ ] **Step 3:** Leak check across history: `git grep -i -I -c -f .confidential-terms $(git rev-list origin/main..HEAD) -- .` → no output; `git log origin/main..HEAD --format=%B | grep -ciEf .confidential-terms` → `0`.
- [ ] **Step 4:** `git push` (deploys). Wait for `https://yashnaj.dev/work/myne` to return 200; verify `/work/mri-viewer/demo` renders `1 / 22` in Chrome; run Lighthouse on `/`, `/work/myne`, `/work/mri-viewer` (≥ 95 each, home 100) and `/work/mri-viewer/demo` (A11y/BP/SEO ≥ 90). Resubmit the sitemap in Search Console.
