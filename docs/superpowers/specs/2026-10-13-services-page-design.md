# Services page — design

A separate `/services` page that sells Yashal's services to local Inland Empire small businesses at about half the going rate. It works on its own now, through organic search, a Google Business Profile and direct outreach. Later in the month it becomes the landing page for local Facebook ads. The portfolio stays the site's main story.

## Intent

**Decided with the user:**
- **Audience:** local small businesses in the Inland Empire / SoCal (Corona, Riverside, Temecula). The ads will be local; there's no ad budget yet.
- **Pricing:** severely undercut the market without looking cheap. Pricing is per fixed package, never hourly.
- **Lead path:** a quote form (main button) plus "Book a 15-min call" (Cal.com; the user has, or will create, an account).
- **Form delivery:** a small Worker of our own sends through Resend, using a new send-only key restricted to yashnaj.dev. Myne Global's key is not reused.
- **Home:** gets one small link to the page, not a redesign.

**Success:** a local owner landing from search or an ad understands the offer and the price within one screen, and can send a quote request in under a minute, on a phone. Without JavaScript the offer still reads in full. The form can't pass the spam check, so it hands over the email address and the call link instead.

**Constraints that stay in force:**
- **Lighthouse (mobile):** home 100, `/work/*` ≥ 95; `/services` ≥ 95, aiming for 100.
- **No raw secrets in the repo.**
- **Confidentiality:** never name the MRI client. The forbidden terms are in `.confidential-terms`.
- **DNS:** never touch the Proton Mail DNS records. Any DNS change goes to the user as a `!` command.
- **Accessibility and reduced motion:** the site's existing guarantees apply.

## Market research behind the prices (October 2026)

| Source | Finding |
|---|---|
| US BLS, May 2025 | Web developers' median pay is $92,650 a year, about $45/hr employed. Freelancers typically charge 1.5–2× that. |
| ContractRates (494 submissions, April 2026) | Freelance web developers average $70/hr, mostly $40–84. |
| Upwork's own cost pages | Global median $27–30/hr. This is the offshore floor; don't compete with it. |
| Clutch app pricing guide (September 2026) | Most app projects cost $10,000–49,999. |
| Clutch small-business survey (cited second-hand) | 61% of small businesses spent under $10k on their last site. |
| 2026 pricing guides (vendor blogs, directional only) | Small-business site from a freelancer or studio: $2,500–9,500. Shopify setup: $1,000–2,500. Custom automation workflow: $400–5,000. Freelance AI chatbot: $1,000–5,000. Web-app pentest: $2,500–15,000. |
| WordStream 2026 | Facebook lead campaigns: median $27.39 per lead (for the later ad budget). |

**How the prices were set:** each price sits at or below the bottom of the freelance range and far below agency rates. With AI-assisted delivery, the effective rate stays at or above the US freelance average. For example, a $1,500 site built in 15–20 hours earns $75–100/hr.

## The page, top to bottom

1. **Hero.**
   - **Headline:** "Websites and software for Inland Empire businesses — at half the agency price."
   - **Proof line:** an engineer with four App Store apps who runs a platform holding $10M+ in assets.
   - **Buttons:** **Get a quote** (jumps to the form) and **Book a 15-min call** (a plain Cal.com link).
2. **Three main packages,** priced cards in the existing drafting-frame style:
   - **Website: $1,500.**
     - Up to 5 pages, mobile-ready, top Lighthouse speed.
     - Basic SEO and Google Business Profile setup.
     - Live in about a week, **no monthly fees**.
     - Variant: landing page (1 page), **$750**.
   - **Online store: $2,500.** Shopify setup, products imported, payments, custom touches.
   - **Connect your tools: from $1,000.** For example, invoices that reconcile themselves (Jobber → QuickBooks), booking → calendar, payment alerts. Includes monitoring and a written handover.
3. **"Also available" strip:**
   - AI assistant or feature, **from $1,500**.
   - App MVP to the App Store, **from $9,500**.
   - Code and access security review, **from $1,500**. Never call it a "pentest".
4. **Why me:** three points, each linking to proof.
   - Fixed price, no hourly surprises.
   - Fast sites: this one scores near 100 on Google's speed test.
   - Local and reachable: based in Corona.
5. **How it works:** three steps.
   1. Quote within 24 hours.
   2. Build, with progress previews.
   3. Launch and handover.
6. **FAQ:**
   - **What do I need to provide?** Logo, photos and text. Help is available if you don't have them.
   - **Do I own the site?** Yes: code, domain and accounts are yours.
   - **What about changes later?** An optional care plan at **$40/month**, or pay per change.
   - **What does hosting cost?** Usually $0–5/month.
   - **How long does it take?** Website about 1 week; store about 2 weeks; automations and apps are quoted.
7. **Quote form:**
   - **Fields:**
     - name (required);
     - business name;
     - email (required);
     - phone (optional);
     - "What do you need?" (required, checkboxes matching the packages, plus "Something else");
     - budget range (select);
     - message;
     - a hidden honeypot field;
     - the Turnstile widget.
   - **Success:** "Thanks — I'll reply within 24 hours."
   - **Send failure:** shows `yashnaj@proton.me` and a `mailto:` prefilled with their message.

**Around the page:**
- The site's layout, footer and blueprint style.
- **Title:** "Website design & software for Inland Empire businesses — Yashal Najeeb". The description names Corona, Riverside and Temecula.
- Canonical URL, Open Graph tags, and added to `sitemap.xml`.
- **Home:** one small "Services for local businesses →" link near the hero actions.

## How it's built

### Page (static)
- **Route:** `src/routes/services/+page.svelte`, pre-rendered.
- **Content and prices:** `src/lib/data/services.ts`, the single source, so a price change is one edit.
- **Without JS:** the form is `<form method="POST" action="/api/quote">` and works with no JS.
- **With JS:** a small client script (`src/lib/client/quote.js`, loaded with `?url` like `enhance.js`) does three things:
  - submits with `fetch`;
  - shows inline status;
  - lazy-loads Turnstile when the form nears the viewport.
- **JS budget:** `/services` ships under 4,096 B gzipped JS of our own. Turnstile's script is third-party and loaded lazily, so it's excluded.
- **Cal.com:** a plain link. The URL lives in `services.ts`; the user provides their username.

### Worker (new, `/api/*` only)
- **Config:** `wrangler.jsonc` gains:
  - `"main": "worker/index.ts"`;
  - an `ASSETS` binding;
  - `run_worker_first: ["/api/*"]`.

  Every other path keeps today's static-asset handling, including the 404 page and trailing-slash rules.
- **`POST /api/quote`:**
  1. **Parse.** Accept `application/x-www-form-urlencoded` or `multipart/form-data`.
  2. **Validate.**
     - Required fields present.
     - Email shape checked.
     - Length caps: name/business 100, email 200, phone 40, message 5,000.
     - "Need" values come from a fixed list.
     - A filled honeypot gets a silent success with no email sent.
  3. **Spam check.** Verify the Turnstile token with `https://challenges.cloudflare.com/turnstile/v0/siteverify`, using the `TURNSTILE_SECRET` secret and the visitor's IP.
  4. **Send.** `POST https://api.resend.com/emails` with the `RESEND_API_KEY` secret:
     - from `Yashnaj.dev quotes <quotes@yashnaj.dev>`;
     - to `yashnaj@proton.me`;
     - `reply_to` set to the lead's email;
     - a plain-text body listing every field.
  5. **Respond.**
     - **Fetch** (`Accept: application/json`): `{ ok: true }`, or `{ ok: false, error, fields? }` with status 400, 403 or 502.
     - **No-JS form post:** a 303 redirect to the static pages `/services/sent` or `/services/error` (noindex). A pre-rendered page can't read a query string without JS.
  6. **Other methods or paths under `/api/`:** 405 or 404.
- **Secrets:** `RESEND_API_KEY` and `TURNSTILE_SECRET`, set by the user with `wrangler secret put`. The Turnstile site key is public and lives in `services.ts`.

### One-time setup (outside the repo)
- **Resend** (user's account, in Chrome):
  1. Add the domain `yashnaj.dev`; Resend uses a `send.` subdomain, so no root or Proton records are touched.
  2. Create a send-only API key restricted to that domain.
  3. Hand the user one `!` command per DNS record: the DKIM TXT on `resend._domainkey`, plus the MX and SPF TXT on `send`.
  4. Hand the user `! bunx wrangler secret put RESEND_API_KEY`; the user pastes the key.
- **Turnstile:** create a widget for `yashnaj.dev`, then the same `wrangler secret put` hand-off for the secret.
- **Cal.com:** the user creates or uses their account and provides the booking link (15-minute event).

## Error handling and edge cases

- **Invalid input:** inline field messages; the visitor's input is kept. No-JS: the redirect carries the error code and the page explains it.
- **Turnstile fails or isn't loaded** (no JS, or blocked): 403 with "please try again". No-JS visitors can't pass Turnstile, so the no-JS error message also shows the email address.
- **Resend failure or timeout** (10 s): 502. The page shows the email fallback, with a `mailto:` prefilled with the visitor's message.
- **Bots:** the honeypot plus Turnstile. No rate-limit binding (YAGNI); revisit if spam appears.
- **Privacy:** lead data goes only to the user's inbox through Resend. Nothing is stored. Nothing is logged except error codes.

## Testing

- **Unit (vitest)** for the Worker handler, faking only `fetch` to Turnstile and Resend:
  - validation and length caps;
  - the honeypot (silent OK, no send);
  - Turnstile failure;
  - Resend failure;
  - JSON vs redirect responses;
  - non-`/api` paths fall through to `ASSETS`.
- **E2E (Playwright):**
  - the page renders every package and price from `services.ts`;
  - the CTAs point at `#quote` and the Cal.com URL;
  - the form's success, validation-error and send-failure states (`/api/quote` intercepted with `page.route`);
  - the no-JS form markup posts to `/api/quote`;
  - `/services/sent` and `/services/error` render their messages (noindex);
  - no layout shift;
  - home links to `/services`.
- **Budgets:** `/services` JS under 4,096 B (extend `budget.test.ts`); confidentiality test passes.
- **Post-deploy:**
  - one real submission reaches the inbox, and Reply goes to the lead;
  - mobile Lighthouse 3× on `/services` (≥ 95) and on home (still 100).

## Out of scope

- Facebook / Meta pixel and ad setup. Added when ads start, with a note on its Lighthouse cost.
- Care-plan checkout and payments.
- An app- or startup-focused services page.
- Storing leads (CRM or database).
