# yashnaj.dev Portfolio — Design (Phase 1)

Date: 2026-10-12
Status: Approved in conversation, pending written-spec review

## 1. Intent

**Who it's for (in priority order):**
1. Recruiters and hiring managers — must understand who Yashal is, what he's shipped, and how to contact him within ~10 seconds.
2. Other developers — should remember the site for its craft and personality.

**Success criteria**
- A recruiter can find the role/pitch, the 4 hero projects, the resume, and contact info without scrolling past anything decorative or waiting on heavy assets.
- The site is visibly crafted: blueprint-style SVG drawings that draw themselves on scroll.
- Lighthouse ≥ 95 in Performance, Accessibility, Best Practices, SEO (mobile).
- Live at `https://yashnaj.dev` on Cloudflare (free tier).

**Out of scope for Phase 1:** the interactive PS1-style Three.js world ("PRESS START" mode). It gets its own spec later. Phase 1 only reserves a "PRESS START ▸ coming soon" affordance and keeps project content in a shared data module that Phase 2 will reuse.

## 2. Visual direction — "Blueprint"

- **Palette (CSS tokens):** `--ink` deep blueprint blue (~`#0b1f3a`) background; `--paper` cream (~`#f2ead8`) for primary line art and text; `--line-dim` cream at ~35% opacity for grid, dimension lines and secondary strokes; one accent `--signal` (warm orange, ~`#ff7a3d`) used sparingly for highlights such as `NO EFFECT` and hover states. Final values are tuned during build for WCAG AA contrast on body text.
- **Background:** faint drafting grid (CSS background, not an image).
- **Type:** Inter Tight (headings, body) and IBM Plex Mono (labels, tags, title blocks, numbers). Self-hosted WOFF2, subset to Latin, `font-display: swap`.
- **Motifs:** corner registration marks, dimension lines with arrowheads, title blocks ("DWG NO. YN-001 · REV 2026"), sheet numbers per project ("SHEET 02 / 05").
- **Motion:** each project drawing animates via `stroke-dasharray`/`stroke-dashoffset` when it enters the viewport (IntersectionObserver, once). Small details (tap ripple, slice scrub, label stamp) run after the line draw completes. No animation library.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, drawings render in their finished state; no looping animation anywhere.

## 3. Page structure (single page)

### 3.1 Hero
- Profile photo from Yashal's LinkedIn, processed into a blueprint duotone (ink/paper) and framed like a drawing inset with corner marks.
- Name: **Yashal Najeeb**
- Role line: **Full-Stack Product Engineer · iOS, React Native, TypeScript, Postgres**
- Pitch: *"Product engineer who takes software from zero to the App Store."*
- Actions: Resume (PDF) · GitHub (`github.com/YashNaj`) · LinkedIn (`linkedin.com/in/yashnaj`) · Email (`yashnaj@proton.me`)
- Small `PRESS START ▸` affordance labelled "coming soon" (non-interactive in Phase 1, `aria-disabled`).
- Title block: "DWG NO. YN-001 · REV 2026 · CORONA, CA".

### 3.2 Selected work — 4 hero project "sheets"
Each sheet: sheet number, title, one-line description, 2–3 sentence summary, one headline metric, stack tags, links, and a self-drawing illustration. Layout alternates drawing left/right on desktop, stacks on mobile.

| # | Project | Summary basis | Headline metric | Drawing | Links |
|---|---|---|---|---|---|
| 01 | **chauffeur** | Lets coding agents drive the iOS Simulator and verifies every action against what changed (`NO EFFECT`, `INTERCEPTED`, `APP CRASHED`). Swift, MCP, Homebrew. | Benchmarked against Xcode 27's MCP over 180 runs: less than half the turns at ~1/6–1/7 the cost; 45/45 tasks verified on Opus. | Phone outline; a tap ripple hits a greyed-out button; `NO EFFECT` label stamps in (accent colour). | GitHub repo `YashNaj/chauffeur`; `brew install yashnaj/chauffeur/chauffeur` shown as copyable command |
| 02 | **Myne Global** | Provenance platform for luxury goods: SvelteKit API, Postgres with RLS, SwiftUI app, Stripe/StoreKit. Owner-held-key encryption, dealer-issued Myne Passports, stolen-item registry of 16,830 records. | $10M+ in registered assets · 400 collectors · 12 NYC dealers | Exploded-view drawing of a passport/vault with callout leaders. | `https://myneglobal.com` |
| 03 | **Mobile MRI/CT viewer** — healthcare records platform (contract) | Clinicians couldn't view scans on mobile because a legacy OHIF fork had no touch support. Built a modern Cornerstone3D renderer in a WebView with all controls native in React Native over a small message bridge. Also hardened authorization across 156 routes and stood up the first iOS release path. | First image on device in under 2 seconds · 57 of 68 UAT defects closed (31/31 mobile) | Stack of scan slices fanning out with a scrubber, beside a phone frame. Abstract only — no real scan imagery. | None |
| 04 | **Hard Pills to Swallow** | Production blog with a pop-art public site and a custom admin: TipTap editor, scheduling, auto-post to X/Threads, mailing list on publish via DB triggers. SvelteKit, Supabase, Drizzle, Vercel. | Live in production, run entirely by its writer | Comic panel grid with halftone hatching and a speech bubble. | `https://hardpillstoswallow.com` |

**Confidentiality rule:** the client/agency for project 03 is never named anywhere on the site, in metadata, alt text, file names or source comments. The forbidden terms (client, agency and recruiter names) live in the gitignored file `.confidential-terms`, one per line, matched case-insensitively. They must never be committed, including in docs.

### 3.3 Also built (compact list)
One line each, no drawings: Serveus (on-demand parcel delivery, App Store), Rider365 (motorcycle ride planning, Expo, App Store), AutoAce (voice-tone and background-noise classifier for call recordings, built in 9 days), FieldDiligence (Jobber-to-QuickBooks invoice matcher).

### 3.4 Experience
Short timeline:
- **Myne Global** — Lead Engineer, Los Angeles, 2021–present
- **Senior Engineer (contract)** — healthcare records platform, May–Jun 2026
- **Freelance Web Developer** — 2021–2023

### 3.5 Footer / contact
`yashnaj@proton.me` (mailto), GitHub, LinkedIn, Resume. Title-block style footer with "© 2026 Yashal Najeeb".

## 4. Assets

- **Profile photo:** downloaded from Yashal's LinkedIn profile via Yashal's logged-in Chrome, stored at `static/img/yashal.webp` (plus a 2× variant), duotone processed at build-prep time (not at runtime). Original kept out of the repo.
- **Resume:** copy of `~/Developer/Yashal Najeeb Resume.pdf` with every line containing a confidential term rewritten generically (e.g. the shipped-product entry becomes "Healthcare records platform · MRI/CT viewing", and the contract role drops the agency name). The exact find/replace pairs live in the gitignored `.resume-redactions.json`. Saved to `static/Yashal-Najeeb-Resume.pdf`. The original PDF is not modified. If an in-place PDF text edit isn't clean, fall back to asking Yashal for an edited export.
- **Social share image:** `static/og.png` (1200×630), a blueprint title-block design with name and role, generated once and committed.
- **Favicon:** SVG monogram "YN" in a registration-mark frame.

## 5. Architecture

**Stack:** SvelteKit 2 + Svelte 5 (runes), TypeScript, Tailwind CSS 4, Bun. `@sveltejs/adapter-static` with full prerender (`export const prerender = true`). No client-side data fetching.

```
src/
  app.css                     # Tailwind + design tokens + grid background
  app.html
  lib/
    data/projects.ts          # Hero projects, also-built list, experience, links. Typed. Single source of truth (reused by Phase 2).
    components/
      Hero.svelte
      ProjectSheet.svelte     # Generic sheet layout; receives a project + a drawing component
      AlsoBuilt.svelte
      Experience.svelte
      Footer.svelte
      TitleBlock.svelte       # Reusable drafting title block
      DrawOnView.svelte       # Wrapper: IntersectionObserver → sets `drawn` state; handles reduced motion
    drawings/
      PhoneNoEffect.svelte    # chauffeur
      PassportVault.svelte    # Myne Global
      ScanSlices.svelte       # MRI viewer
      ComicPanels.svelte      # Hard Pills
  routes/
    +layout.svelte            # fonts, meta, OG tags
    +layout.ts                # prerender = true
    +page.svelte              # composes sections from data
static/
  fonts/ img/ og.png favicon.svg Yashal-Najeeb-Resume.pdf
tests/
  smoke.spec.ts               # Playwright
wrangler.jsonc
```

**Data shape (`projects.ts`):**
```ts
type Project = {
  slug: 'chauffeur' | 'myne' | 'mri-viewer' | 'hard-pills';
  sheet: string;          // "01"
  title: string;
  tagline: string;
  summary: string;
  metric: string;
  stack: string[];
  links: { label: string; href: string }[];
  command?: string;       // copyable shell command (chauffeur)
};
```
Drawings are mapped by `slug` in `+page.svelte`, keeping data free of component imports so Phase 2 can import it without Svelte.

**Drawing technique:** each drawing is an inline SVG whose stroked paths carry `pathLength="1"`, so a single CSS rule (`stroke-dasharray: 1; stroke-dashoffset: 1 → 0`) animates any path uniformly. Staggering is done with CSS custom properties (`--i`) per path. `DrawOnView` toggles a `data-drawn` attribute; all animation is CSS.

**JS budget:** < 30 KB gzipped on first load (SvelteKit runtime + IntersectionObserver wrapper + copy-to-clipboard). No Three.js in Phase 1.

## 6. Accessibility & SEO
- Semantic landmarks (`header`, `main`, `section` with headings, `footer`); one `h1`.
- Every drawing has `role="img"` and a descriptive `aria-label`; decorative grid/marks are `aria-hidden`.
- Text contrast ≥ 4.5:1; `--line-dim` used only for decorative strokes, never for text that must be read.
- Visible focus styles in the accent colour; full keyboard navigation.
- `<title>`, meta description, canonical `https://yashnaj.dev/`, Open Graph/Twitter tags, JSON-LD `Person` (name, url, sameAs GitHub/LinkedIn, jobTitle). No email in JSON-LD.

## 7. Deployment

- **Platform:** Cloudflare Workers with static assets, free tier, deployed with Wrangler (`wrangler deploy`). `wrangler.jsonc` points `assets.directory` at the adapter-static `build/` output; no Worker script needed.
- **Domain:** add `yashnaj.dev` as a zone in the Cloudflare account (yashalnajeeb@gmail.com's Account), review imported DNS records against Porkbun's current records, then change nameservers at Porkbun to Cloudflare's. Porkbun remains registrar. Attach `yashnaj.dev` and `www.yashnaj.dev` (www redirects to apex) as custom domains on the Worker.
- **Confirmation gates:** Yashal confirms before (a) creating the GitHub repo, (b) adding the Cloudflare zone, (c) changing nameservers at Porkbun, (d) the first production deploy to the custom domain.
- **CI:** GitHub repo `YashNaj/yashnaj-landing`; Cloudflare Workers Builds connected to it so pushes to `main` deploy automatically. Preview URL on `*.workers.dev` used for verification before DNS cut-over.

## 8. Testing & verification
- `bun run check` (svelte-check) passes with 0 errors.
- `bun run build` produces a fully prerendered site.
- Playwright smoke test against the built preview: page loads, `h1` contains "Yashal Najeeb", 4 project sheets exist with correct titles, resume link returns a PDF, mailto/GitHub/LinkedIn hrefs are correct, no confidential term from `.confidential-terms` anywhere in `build/` or the resume PDF (unit test; skipped with a warning when the file is absent, e.g. in CI).
- Reduced-motion check: with emulated `prefers-reduced-motion`, drawings are fully visible on load.
- Lighthouse (mobile) on the deployed preview URL: all four categories ≥ 95.
- Manual visual check in Chrome at 390px and 1440px widths.

## 9. Phase 2 hook (not built now)
"PRESS START" will lazy-load a Threlte/Three.js PS1-style scene (vertex snapping, affine texture warp, dithering, 320×240 render target) on its own route or overlay, reading `src/lib/data/projects.ts`. Separate spec.
