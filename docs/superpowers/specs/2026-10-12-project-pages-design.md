# Project Pages, Carousel & Live MRI Demo — Design

Date: 2026-10-12
Status: Approved in conversation, pending written-spec review
Builds on: `docs/superpowers/specs/2026-10-12-portfolio-design.md` (Phase 1, live at https://yashnaj.dev)

## 1. Intent

Give each hero project a dedicated page that a visitor reaches through a smooth, "sexy" morph from its home-page sheet, with an image/video carousel and a longer write-up — and host Yashal's stripped-down MRI/CT viewer as a live, try-it demo.

**Success criteria**
- Clicking a project sheet on the home page morphs into that project's page (title, drawing, sheet number and frame glide to their new positions); browser Back reverses it.
- Each project page has a carousel of real product imagery/video and a structured write-up.
- The live MRI viewer loads and renders the first image on yashnaj.dev, scrolls slices, switches series and tools.
- Home page stays at ~1 KB JS and Lighthouse 100s; project pages ≥ 95 in all four categories; demo page ≥ 90 Accessibility/Best Practices/SEO (performance is excused — it is a 6 MB imaging app by design).
- No confidential term (gitignored `.confidential-terms`) anywhere in the built output, including the demo bundle, scan index and media.

**Out of scope:** Phase 2 PS1 mode; admin or login-only screenshots; a lightbox/zoom mode for slides; CMS or MDX — content stays in TypeScript data.

## 2. Routes

| Route | Content | JS |
|---|---|---|
| `/` | Unchanged layout; each sheet gains a "View project →" link and becomes the morph source | ~1 KB (existing `enhance.js`) |
| `/work/chauffeur`, `/work/myne`, `/work/mri-viewer`, `/work/hard-pills` | Project page (§4) | `enhance.js` + carousel script (< 4 KB gz total) |
| `/work/mri-viewer/demo` | Full-screen live viewer (§6) | the viewer bundle (~6 MB, loaded only here) |

All routes prerendered; project pages use `csr = false` like the home page. Each project page has its own `<title>`, description, canonical and OG tags, and is added to `sitemap.xml`.

## 3. Morph transition

- Cross-document View Transitions: `@view-transition { navigation: auto; }` in global CSS. No animation library; no client router.
- Shared `view-transition-name`s per project, identical on the home sheet and the project page: `sheet-<slug>` (frame), `title-<slug>`, `drawing-<slug>`, `sheetno-<slug>`. Names must be unique per page.
- Everything else cross-fades (default root transition), ~350 ms, eased.
- Browsers without cross-document view transitions (e.g. Firefox at time of writing) navigate normally — acceptable.
- `prefers-reduced-motion: reduce` disables the view transition animations (`::view-transition-group(*) { animation: none }`).
- The whole sheet is not a giant link (keeps text selectable and the copy button usable); the title and a "View project →" link navigate.

## 4. Project page layout (top to bottom)

1. Back link ("← All work"), sheet number, title, tagline — the morph targets.
2. Drawing (same component as home) beside the headline metric and stack tags.
3. **Carousel** (§5).
4. Write-up sections: **The problem**, **What I built**, **How it works**, **Outcome**. Drafted from the repos/README/resume; Yashal edits. Plain text in the data module (`detail` field), no Markdown.
5. Links (live site, App Store, GitHub; MRI: "Try the live viewer" primary button).
6. Footer nav: ← previous project · next project →.

Content source of truth stays `src/lib/data/site.ts`; each `Project` gains `detail: { problem: string; built: string; how: string; outcome: string }` and `slides: Slide[]`.

## 5. Carousel

**Data**
```ts
type Slide =
  | { kind: 'image'; src: string; width: number; height: number; alt: string; caption: string; frame: 'phone' | 'browser' }
  | { kind: 'video'; src: string; poster: string; width: number; height: number; alt: string; caption: string; frame: 'phone' | 'browser' }
  | { kind: 'cta'; href: string; label: string; caption: string };
```

**Behaviour**
- Native horizontal scroll with CSS `scroll-snap-type: x mandatory`; swipe/trackpad/shift-scroll work with zero JS.
- Script (progressive enhancement) adds: prev/next buttons, dot indicators, a blueprint counter `FIG. 02 / 05`, ←/→ keys when the carousel has focus, and updates `aria-current` on the active dot via IntersectionObserver.
- Subtle parallax: the active slide's frame sits at full scale/opacity; neighbours at 0.94 scale / 0.6 opacity, driven by CSS scroll-driven animations (`animation-timeline: view(inline)`) where supported, static otherwise.
- Videos: `muted playsinline loop preload="none"` with a poster; play only while their slide is ≥ 60% visible, pause otherwise; never autoplay under reduced motion (show poster + play button).
- Frames: CSS-drawn phone (rounded, notch) and browser (title bar with three dots + URL) frames in blueprint line style.
- Captions as numbered callouts below the frame (mono, `FIG. n —`).
- Accessibility: `role="region"` + `aria-roledescription="carousel"` + label; each slide `role="group"` `aria-roledescription="slide"` `aria-label="n of N"`; buttons have labels; all images have alt text; focusable scroller.
- Without JS: still a swipeable/scrollable strip with every slide visible — nothing hidden.

**Slides per project**

| Project | Slides | Frame |
|---|---|---|
| Myne Global | 5 official App Store screenshots (app v1.2.0), fetched from Apple's public lookup API, stored locally as WebP | phone |
| chauffeur | `honest.mp4` (NO EFFECT), `race.mp4` (vs Xcode 27 MCP), `crash.mp4` (APP CRASHED) from the chauffeur repo's `docs/media`, re-encoded to ≤ 1.2 MB H.264 + poster WebP | browser |
| MRI viewer | 3 captures of the demo (series view, window/level, mid-scroll) taken with Playwright, + a `cta` slide "Try the live viewer" | phone |
| Hard Pills | Captures of https://hardpillstoswallow.com: home (desktop), an article (desktop), home (mobile) | browser / phone |

Image budget: each WebP ≤ 150 KB at 2× of displayed size; lazy-loaded except the first slide.

## 6. Live MRI demo

- Source: Yashal's local demo folder (his own stripped-down viewer; functional code is open source). Copied into the repo at `static/demo/mri/` (viewer page, `mobile/` bundle, `study/`).
- Rebrand: page titles become "MRI/CT Viewer — Demo"; the confidential name is removed from every file (verified by the confidentiality test, which now also scans `static/demo/`).
- Path rewrite: the demo assumes root paths (`/mobile/index.html`, `/study/…`) and `http://localhost:8787` URLs in `study/index.json`. All are rewritten to `/demo/mri/...` relative to the site origin. `browser-fallback.js`, `server.js`, `start/stop` scripts, logs and the interview brief are NOT copied.
- `/work/mri-viewer/demo` is a SvelteKit page (blueprint chrome: back link, title, credit) that embeds the demo page in an `<iframe>` sized as a phone frame on ≥ md screens and full-bleed on mobile.
- Credit line on the demo page and the MRI project page: "Sample study: BRAINIX, from the OsiriX / Orthanc public DICOM sample library — for teaching and demonstration." The study's patient identifiers are already scrambled; no further PHI.
- Size: ~72 MB of static files (65 MB DICOM). Within Cloudflare Workers static-asset limits (25 MB/file, 20k files). DICOM files served with long cache headers via a `static/_headers` entry for `/demo/mri/study/*` (`Cache-Control: public, max-age=31536000, immutable`).
- `robots.txt` disallows `/demo/` (the raw viewer is not a useful search result; `/work/mri-viewer/demo` stays indexable).

## 7. Testing

- Unit: every project has `detail` (4 non-empty fields) and ≥ 3 slides; every image/video/poster `src` exists under `static/`; every slide has alt text; sitemap contains all 5 new URLs.
- E2E:
  - Home sheet "View project →" navigates to `/work/<slug>`; elements carrying each `view-transition-name` exist on both pages with matching names (the animation itself is not asserted).
  - Carousel: next/prev buttons and ←/→ move the active slide and counter; dots reflect the active slide; works at 360 px without horizontal page overflow; without JS all slides are present and scrollable.
  - Video slides pause when scrolled away; reduced motion → no autoplay.
  - Demo: `/work/mri-viewer/demo` iframe loads, the viewer reports a loaded stack (first image rendered: the demo's overlay hides and the slice label reads `1 / 22`), series chip switch updates the label.
  - Existing tests keep passing; JS budget test extended to project pages (< 4 KB gz).
- Confidentiality test extended to `static/demo/**` and all new media file names.
- Lighthouse on `/work/myne` and `/work/mri-viewer` (≥ 95 all four) after deploy.

## 8. Risks & decisions

- **View-transition support** varies; the site works fully without it.
- **Repo size:** +~80 MB of binaries (DICOM + media) in git. Acceptable for a portfolio; no LFS.
- **App Store screenshot use:** Myne Global's own marketing images, used by its lead engineer to describe his work there.
- **Hard Pills screenshots** show the writer's public posts — public content, shown as a product capture.
