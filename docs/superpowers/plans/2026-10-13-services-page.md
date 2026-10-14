# Services Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/services` page that sells fixed-price packages to Inland Empire small businesses. Its quote form emails leads to the user through a small Cloudflare Worker and Resend, and a Cal.com link books calls.

**Architecture:**
- **The page:** pre-rendered SvelteKit (`csr = false`) like every other page. Packages, prices and form options live in one pure-TS data file.
- **The Worker:** the existing static-assets Worker gains a script entry (`worker/index.ts`) that runs only for `/api/*`. It validates the form, verifies Cloudflare Turnstile and sends through the Resend HTTP API.
- **The client script:** a small script (`quote.js`) submits the form in place and lazy-loads Turnstile.

**Tech Stack:**
- SvelteKit (adapter-static), Svelte 5, Tailwind v4, `src/app.css`
- A Cloudflare Worker with static assets (`wrangler.jsonc`)
- Resend REST API and Cloudflare Turnstile
- Vitest (Node) and Playwright

**Spec:** `docs/superpowers/specs/2026-10-13-services-page-design.md`

## Global Constraints

- **Confidentiality:** never name the MRI client anywhere (code, docs, commit messages, chat). The forbidden terms are in the gitignored `.confidential-terms`.
- **Leak check:** before **every** commit, run these as their own step, never chained with a commit or push. Both must print `0`:
  - `git diff --cached | grep -ciEf .confidential-terms`
  - `git diff --cached --name-only | grep -ciEf .confidential-terms`
- **Commit trailer** (this repo only; chauffeur takes none):
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Bbe6pam2qewCRzNRjQgWub
  ```
- **DNS:** never touch the Proton Mail DNS records (MX, SPF, verification TXTs, DKIM CNAMEs, DMARC). Every DNS change goes to the user as a `!` command; auto mode blocks DNS edits.
- **Secrets:** never in the repo or in chat. The user runs `wrangler secret put` and pastes the value themselves. Never type an API key or secret into any field.
- **Accounts:** never create accounts. The user has Resend, Cloudflare and Cal.com.
- **Lighthouse (mobile):** home 100, `/work/*` ≥ 95, `/services` ≥ 95 (aim 100).
- **JS budgets:**
  - `/work/*` and `/services` each ship under 4,096 B of gzipped first-party JS, inline head script included.
  - Home stays under 30 KB.
- **Prices (verbatim):**

  | Package | Price |
  |---|---|
  | Website | $1,500 |
  | Landing page | $750 |
  | Online store | $2,500 |
  | Connect your tools | from $1,000 |
  | AI assistant or feature | from $1,500 |
  | App MVP | from $9,500 |
  | Code & access security review | from $1,500 |
  | Care plan | $40/month |

- **Wording:** never call the security review a "pentest". The email recipient is `yashnaj@proton.me`, the sender `quotes@yashnaj.dev`.

## Rulings made while planning

- **No-JS result pages instead of query strings.** The spec has no-JS posts redirect to `/services?sent=1` / `?error=…`. A pre-rendered page can't read a query string without JS, so the Worker redirects to two tiny static pages instead: `/services/sent` and `/services/error` (noindex). Task 2 amends the spec to match. *Cost if wrong:* two extra 1 KB pages.
- **Cal.com URL assumed.** The user didn't give their link, so `CAL_URL = 'https://cal.com/yashnaj/15min'`. It's flagged at the screenshot gate (Task 4) for the user to confirm or replace (one line in `services.ts`). *Cost if wrong:* a broken call button until fixed.
- **Turnstile test key until setup.** `TURNSTILE_SITE_KEY` starts as Cloudflare's always-pass test site key `1x00000000000000000000AA`. Task 5 swaps in the real key after the widget exists. *Cost if wrong:* none; the test key only passes with the test secret.
- **Honeypot name `fax`.** It's hidden off-screen, `tabindex=-1`, `autocomplete=off`.

- **Brevo instead of Resend (ruled during execution).** The user's only Resend team belongs to Myne Global and a second team is paid, so the Worker sends through Brevo's free transactional API (`POST https://api.brevo.com/v3/smtp/email`, `api-key` header, secret `BREVO_API_KEY`). Task 1's code blocks below show the original Resend version; the code in `worker/index.ts` is the source of truth. Task 5's Resend steps become the same steps in Brevo. *Cost if wrong:* one `send()` function to swap back.

## Review Focus

1. **A visitor whose browser blocks `challenges.cloudflare.com`** (privacy extensions, some corporate networks). The submit must end in the email fallback, never hang on "Sending…". Covered by Task 3's "turnstile blocked" e2e test.
2. **A double-click on Send.** It must not send two emails: the button disables while a request is in flight. Covered by Task 3's double-submit e2e test.
3. **A lead's message with newlines, quotes or `<script>`.** The email must arrive as plain text, unaltered, and the subject must contain no line breaks. Covered by Task 1's "hostile input" unit test.
4. **Opening `/services` from a home link with view transitions.** The page has no `data-vt-page`, so it gets the plain crossfade, never the case-study fold. Covered by Task 2's e2e test.
5. **Resend or Turnstile slow or down.** Each outbound call times out at 10 s, and a timeout counts as a failure (the email fallback). Covered by Task 1's "network error" unit test; timeouts use the same `catch` path.

---

### Task 1: Data module and the quote Worker

**Files:**
- Create: `src/lib/data/services.ts`
- Create: `worker/index.ts`
- Modify: `wrangler.jsonc`
- Test: `tests/unit/quote-worker.test.ts`

**Interfaces:**
- Produces, from `src/lib/data/services.ts`:
  - `type Need = 'website' | 'landing' | 'store' | 'automation' | 'ai' | 'app' | 'security' | 'other'`
  - `NEEDS: { id: Need; label: string }[]`
  - `BUDGETS: readonly string[]`
  - `QUOTE_LIMITS: { name: 100; business: 100; email: 200; phone: 40; message: 5000 }`
  - `packages: Package[]`, `also: Package[]`, `why`, `steps`, `faq`
  - `CAL_URL: string`, `TURNSTILE_SITE_KEY: string`
- Produces, from `worker/index.ts`:
  - `default { fetch(req: Request, env: Env): Promise<Response> }`
  - `interface Env { ASSETS: { fetch(req: Request): Promise<Response> }; RESEND_API_KEY: string; TURNSTILE_SECRET: string }`
- **Wire contract with Task 3:** `POST /api/quote`, form-encoded, with fields `name`, `business`, `email`, `phone`, `need` (repeated), `budget`, `message`, `fax` (honeypot) and `cf-turnstile-response`.
  - With `Accept: application/json`, it replies with:
    - `200 {ok:true}`;
    - `400 {ok:false,error:'invalid',fields:{[field]:message}}`;
    - `403 {ok:false,error:'turnstile'}`;
    - `502 {ok:false,error:'send'}`.
  - Otherwise it replies `303` to `/services/sent` or `/services/error`.

- [ ] **Step 1: Write the data module.** No behaviour yet; the tests in Step 2 consume it.

`src/lib/data/services.ts`:

```ts
// Single source for the services page and the quote Worker (worker/index.ts imports this file,
// so keep it plain TypeScript: no $lib aliases, no Svelte).
export type Need = 'website' | 'landing' | 'store' | 'automation' | 'ai' | 'app' | 'security' | 'other';
export type Package = { id: Need; name: string; price: string; note?: string; blurb: string; includes: string[] };

export const CAL_URL = 'https://cal.com/yashnaj/15min';
// Cloudflare's always-pass test key until the real widget exists (swapped at launch).
export const TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

export const packages: Package[] = [
	{
		id: 'website',
		name: 'Website',
		price: '$1,500',
		note: 'One-page landing site: $750',
		blurb: 'A fast, professional site that brings in calls and bookings.',
		includes: ['Up to 5 pages, built for phones first', 'Top Google speed scores', 'Basic SEO + Google Business Profile setup', 'Live in about a week', 'No monthly fees']
	},
	{
		id: 'store',
		name: 'Online store',
		price: '$2,500',
		blurb: 'Start selling online without the agency bill.',
		includes: ['Shopify setup and theme', 'Products imported', 'Payments and shipping', 'Custom touches (drops, members-only)', 'Live in about two weeks']
	},
	{
		id: 'automation',
		name: 'Connect your tools',
		price: 'from $1,000',
		blurb: 'Stop copying data between apps by hand.',
		includes: ['Invoices that reconcile themselves (Jobber → QuickBooks)', 'Bookings into your calendar', 'Payment and lead alerts', 'Monitoring so it never fails silently', 'A written handover']
	}
];

export const also: Package[] = [
	{ id: 'ai', name: 'AI assistant or feature', price: 'from $1,500', blurb: 'Answer customers, sort calls or draft quotes automatically.', includes: [] },
	{ id: 'app', name: 'App MVP to the App Store', price: 'from $9,500', blurb: 'iPhone and Android apps, shipped — I’ve launched four.', includes: [] },
	{ id: 'security', name: 'Code & access security review', price: 'from $1,500', blurb: 'Find who can see or change what they shouldn’t, before someone else does.', includes: [] }
];

export const why = [
	{ title: 'Fixed price', body: 'You know the cost before I start. No hourly surprises.' },
	{ title: 'Fast by default', body: 'The page you’re reading scores near 100 on Google’s speed test. Yours will too.' },
	{ title: 'Local and reachable', body: 'Based in Corona. Real engineering — the same work behind apps on the App Store.' }
];

export const steps = [
	{ title: 'Quote', body: 'Tell me what you need. I reply within 24 hours with a fixed price.' },
	{ title: 'Build', body: 'You see progress as it happens, with a preview link.' },
	{ title: 'Launch', body: 'We go live together. You own everything, with a written handover.' }
];

export const faq = [
	{ q: 'What do I need to provide?', a: 'Your logo, photos and the words you want. Don’t have them? I can help with that.' },
	{ q: 'Do I own the site?', a: 'Yes. The code, the domain and every account are yours.' },
	{ q: 'What if I need changes later?', a: 'An optional care plan is $40/month for edits and uptime checks, or you pay per change.' },
	{ q: 'What does hosting cost?', a: 'Usually $0–5 a month. No builder subscription.' },
	{ q: 'How long does it take?', a: 'A website about a week, a store about two. Automations and apps are quoted.' }
];

export const NEEDS: { id: Need; label: string }[] = [
	{ id: 'website', label: 'Website' },
	{ id: 'landing', label: 'Landing page' },
	{ id: 'store', label: 'Online store' },
	{ id: 'automation', label: 'Connect my tools' },
	{ id: 'ai', label: 'AI assistant' },
	{ id: 'app', label: 'App' },
	{ id: 'security', label: 'Security review' },
	{ id: 'other', label: 'Something else' }
];

export const BUDGETS = ['Under $1,000', '$1,000–2,500', '$2,500–5,000', '$5,000–10,000', '$10,000+', 'Not sure yet'] as const;

export const QUOTE_LIMITS = { name: 100, business: 100, email: 200, phone: 40, message: 5000 } as const;
```

- [ ] **Step 2: Write the failing Worker tests.**

`tests/unit/quote-worker.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../../worker/index';

const assets = vi.fn(async () => new Response('asset'));
const env = { ASSETS: { fetch: assets }, RESEND_API_KEY: 're_test', TURNSTILE_SECRET: 'ts_test' };
const good: Record<string, string | string[]> = {
	name: 'Ana Ruiz',
	business: 'Ana’s Tacos',
	email: 'ana@example.com',
	phone: '',
	need: ['website'],
	budget: '$1,000–2,500',
	message: 'Need a site',
	fax: '',
	'cf-turnstile-response': 'tok'
};

function post(fields: Record<string, string | string[]>, accept = 'application/json') {
	const body = new URLSearchParams();
	for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) body.append(k, x);
	return new Request('https://yashnaj.dev/api/quote', {
		method: 'POST',
		body,
		headers: { accept, 'content-type': 'application/x-www-form-urlencoded', 'CF-Connecting-IP': '203.0.113.7' }
	});
}

let calls: { url: string; init: RequestInit }[];
let turnstile: 'ok' | 'fail' | 'down';
let resend: 'ok' | 'fail' | 'down';
beforeEach(() => {
	calls = [];
	turnstile = 'ok';
	resend = 'ok';
	assets.mockClear();
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit) => {
			calls.push({ url: String(url), init });
			const state = String(url).includes('challenges.cloudflare.com') ? turnstile : resend;
			if (state === 'down') throw new TypeError('network down');
			if (String(url).includes('challenges.cloudflare.com')) return Response.json({ success: state === 'ok' });
			return new Response('{}', { status: state === 'ok' ? 200 : 500 });
		})
	);
});
afterEach(() => vi.unstubAllGlobals());

const resendCall = () => calls.find((c) => c.url === 'https://api.resend.com/emails');

describe('POST /api/quote', () => {
	it('emails a valid quote to the inbox, reply-to the lead', async () => {
		const res = await worker.fetch(post(good), env);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
		const ts = calls.find((c) => c.url.includes('challenges.cloudflare.com'))!;
		const tsBody = ts.init.body as FormData;
		expect([tsBody.get('secret'), tsBody.get('response'), tsBody.get('remoteip')]).toEqual(['ts_test', 'tok', '203.0.113.7']);
		const r = resendCall()!;
		expect((r.init.headers as Record<string, string>).Authorization).toBe('Bearer re_test');
		const mail = JSON.parse(String(r.init.body));
		expect(mail.from).toBe('Yashnaj.dev quotes <quotes@yashnaj.dev>');
		expect(mail.to).toEqual(['yashnaj@proton.me']);
		expect(mail.reply_to).toBe('ana@example.com');
		expect(mail.subject).toBe('Quote request: Website — Ana’s Tacos');
		expect(mail.text).toContain('Business: Ana’s Tacos');
		expect(mail.text).toContain('Budget: $1,000–2,500');
		expect(mail.text).toContain('Need a site');
	});

	it('rejects missing required fields with per-field messages and calls nothing', async () => {
		const res = await worker.fetch(post({ ...good, name: ' ', email: '', need: [] }), env);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('invalid');
		expect(Object.keys(body.fields).sort()).toEqual(['email', 'name', 'need']);
		expect(calls).toEqual([]);
	});

	it('rejects a bad email, over-long fields, unknown needs and budgets', async () => {
		const res = await worker.fetch(
			post({ ...good, email: 'ana@', message: 'x'.repeat(5001), phone: '1'.repeat(41), need: ['rocket'], budget: '$1M' }),
			env
		);
		const body = await res.json();
		expect(Object.keys(body.fields).sort()).toEqual(['budget', 'email', 'message', 'need', 'phone']);
		expect(calls).toEqual([]);
	});

	it('keeps hostile input as plain text and the subject on one line', async () => {
		const res = await worker.fetch(post({ ...good, business: 'Evil\r\nBcc: x@y.z', message: '<script>alert(1)</script>\n"quoted"' }), env);
		expect(res.status).toBe(200);
		const mail = JSON.parse(String(resendCall()!.init.body));
		expect(mail.subject).not.toMatch(/[\r\n]/);
		expect(mail.text).toContain('<script>alert(1)</script>\n"quoted"');
		expect(mail.html).toBeUndefined();
	});

	it('a filled honeypot gets a quiet success and sends nothing', async () => {
		const res = await worker.fetch(post({ ...good, fax: '555' }), env);
		expect(await res.json()).toEqual({ ok: true });
		expect(calls).toEqual([]);
	});

	it('a failed or missing spam check is a 403 and sends nothing', async () => {
		turnstile = 'fail';
		const res = await worker.fetch(post(good), env);
		expect(res.status).toBe(403);
		expect((await res.json()).error).toBe('turnstile');
		expect(resendCall()).toBeUndefined();
		const none = await worker.fetch(post({ ...good, 'cf-turnstile-response': '' }), env);
		expect(none.status).toBe(403);
	});

	it('a Resend rejection or network error is a 502', async () => {
		resend = 'fail';
		expect((await worker.fetch(post(good), env)).status).toBe(502);
		resend = 'down';
		const res = await worker.fetch(post(good), env);
		expect(res.status).toBe(502);
		expect((await res.json()).error).toBe('send');
		turnstile = 'down';
		expect((await worker.fetch(post(good), env)).status).toBe(403);
	});

	it('a form post without JS redirects to the static result pages', async () => {
		const ok = await worker.fetch(post(good, 'text/html'), env);
		expect([ok.status, ok.headers.get('location')]).toEqual([303, 'https://yashnaj.dev/services/sent']);
		turnstile = 'fail';
		const bad = await worker.fetch(post(good, 'text/html'), env);
		expect([bad.status, bad.headers.get('location')]).toEqual([303, 'https://yashnaj.dev/services/error']);
	});
});

describe('routing', () => {
	it('only POST is allowed on /api/quote; other /api paths 404', async () => {
		const get = await worker.fetch(new Request('https://yashnaj.dev/api/quote'), env);
		expect([get.status, get.headers.get('allow')]).toEqual([405, 'POST']);
		expect((await worker.fetch(new Request('https://yashnaj.dev/api/nope'), env)).status).toBe(404);
		expect(assets).not.toHaveBeenCalled();
	});
	it('everything else is served from the static assets', async () => {
		const res = await worker.fetch(new Request('https://yashnaj.dev/services'), env);
		expect(await res.text()).toBe('asset');
		expect(assets).toHaveBeenCalledOnce();
	});
});
```

- [ ] **Step 3: Run the tests to check they fail.**

Run: `bunx vitest run tests/unit/quote-worker.test.ts`

Expected: FAIL. The import of `../../worker/index` can't be resolved.

- [ ] **Step 4: Implement the Worker.**

`worker/index.ts`:

```ts
// Runs only for /api/* (wrangler.jsonc run_worker_first); every other path is the static site.
import { BUDGETS, NEEDS, QUOTE_LIMITS } from '../src/lib/data/services';

export interface Env {
	ASSETS: { fetch(req: Request): Promise<Response> };
	RESEND_API_KEY: string;
	TURNSTILE_SECRET: string;
}

type Fields = { name: string; business: string; email: string; phone: string; needs: string[]; budget: string; message: string };
type Body = { ok: true } | { ok: false; error: 'invalid' | 'turnstile' | 'send'; fields?: Record<string, string> };

const INBOX = 'yashnaj@proton.me';
const FROM = 'Yashnaj.dev quotes <quotes@yashnaj.dev>';
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT = 10_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEED_LABEL = new Map<string, string>(NEEDS.map((n) => [n.id, n.label]));

function validate(form: FormData): { fields: Fields; errors: Record<string, string> } {
	const s = (k: string) => String(form.get(k) ?? '').trim();
	const fields: Fields = {
		name: s('name'),
		business: s('business'),
		email: s('email'),
		phone: s('phone'),
		needs: form.getAll('need').map(String),
		budget: s('budget'),
		message: s('message')
	};
	const errors: Record<string, string> = {};
	if (!fields.name) errors.name = 'Please add your name.';
	if (!fields.email) errors.email = 'Please add your email.';
	else if (!EMAIL.test(fields.email)) errors.email = 'Enter a valid email.';
	for (const k of ['name', 'business', 'email', 'phone', 'message'] as const) {
		if (!errors[k] && fields[k].length > QUOTE_LIMITS[k]) errors[k] = `Keep this under ${QUOTE_LIMITS[k]} characters.`;
	}
	if (!fields.needs.length || fields.needs.some((n) => !NEED_LABEL.has(n))) errors.need = 'Pick what you need.';
	if (fields.budget && !(BUDGETS as readonly string[]).includes(fields.budget)) errors.budget = 'Pick a budget range.';
	return { fields, errors };
}

async function verifyTurnstile(token: string, ip: string | null, secret: string): Promise<boolean> {
	if (!token) return false;
	const body = new FormData();
	body.append('secret', secret);
	body.append('response', token);
	if (ip) body.append('remoteip', ip);
	try {
		const r = await fetch(SITEVERIFY, { method: 'POST', body, signal: AbortSignal.timeout(TIMEOUT) });
		return ((await r.json()) as { success?: boolean }).success === true;
	} catch {
		return false;
	}
}

async function send(f: Fields, key: string): Promise<boolean> {
	const needs = f.needs.map((n) => NEED_LABEL.get(n)).join(', ');
	const subject = `Quote request: ${needs} — ${f.business || f.name}`.replace(/[\r\n]+/g, ' ');
	const text = [
		`Name: ${f.name}`,
		`Business: ${f.business || '—'}`,
		`Email: ${f.email}`,
		`Phone: ${f.phone || '—'}`,
		`Needs: ${needs}`,
		`Budget: ${f.budget || '—'}`,
		'',
		f.message || '(no message)'
	].join('\n');
	try {
		const r = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ from: FROM, to: [INBOX], reply_to: f.email, subject, text }),
			signal: AbortSignal.timeout(TIMEOUT)
		});
		return r.ok;
	} catch {
		return false;
	}
}

function reply(req: Request, status: number, body: Body): Response {
	if ((req.headers.get('accept') ?? '').includes('application/json')) return Response.json(body, { status });
	// no-JS form post: land on a static result page
	const to = new URL(body.ok ? '/services/sent' : '/services/error', req.url);
	return new Response(null, { status: 303, headers: { Location: to.toString() } });
}

async function quote(req: Request, env: Env): Promise<Response> {
	if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
	let form: FormData;
	try {
		form = await req.formData();
	} catch {
		return reply(req, 400, { ok: false, error: 'invalid' });
	}
	if (String(form.get('fax') ?? '') !== '') return reply(req, 200, { ok: true }); // honeypot: bots get a quiet success
	const { fields, errors } = validate(form);
	if (Object.keys(errors).length) return reply(req, 400, { ok: false, error: 'invalid', fields: errors });
	const token = String(form.get('cf-turnstile-response') ?? '');
	if (!(await verifyTurnstile(token, req.headers.get('CF-Connecting-IP'), env.TURNSTILE_SECRET))) {
		return reply(req, 403, { ok: false, error: 'turnstile' });
	}
	if (!(await send(fields, env.RESEND_API_KEY))) return reply(req, 502, { ok: false, error: 'send' });
	return reply(req, 200, { ok: true });
}

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		const { pathname } = new URL(req.url);
		if (pathname === '/api/quote') return quote(req, env);
		if (pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
		return env.ASSETS.fetch(req);
	}
};
```

- [ ] **Step 5: Run the tests to check they pass.**

Run: `bunx vitest run tests/unit/quote-worker.test.ts`

Expected: PASS, 10 tests.

- [ ] **Step 6: Wire the Worker into `wrangler.jsonc`.** Replace the file with:

```jsonc
{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "yashnaj-landing",
	"main": "worker/index.ts",
	"compatibility_date": "2026-10-01",
	"build": {
		"command": "bun run build"
	},
	"workers_dev": false,
	"routes": [
		{ "pattern": "yashnaj.dev", "custom_domain": true },
		{ "pattern": "www.yashnaj.dev", "custom_domain": true }
	],
	"assets": {
		"directory": "./build",
		"binding": "ASSETS",
		"not_found_handling": "404-page",
		"html_handling": "drop-trailing-slash",
		// only the quote API runs the script; every other request is served straight from build/
		"run_worker_first": ["/api/*"]
	}
}
```

Then verify the bundle and config without deploying:

Run: `bun run build > /dev/null && bunx wrangler deploy --dry-run --outdir /private/tmp/claude-502/-Users-Yash-Developer-repos-yashnaj-landing/wrangler-dry`

Expected: it exits 0, and its output lists the `env.ASSETS` binding. If wrangler rejects `run_worker_first` as an array, check `bunx wrangler --version`. The array form needs wrangler ≥ 4.20, and the repo pins `^4.149`. Ledger any change.

- [ ] **Step 7: Run the unit suite.**

Run: `bunx vitest run`

Expected: all pass. The budget/confidentiality tests read `build/`, which Step 6 rebuilt.

- [ ] **Step 8: Run the leak check (its own step).** Run the two greps from Global Constraints. Both must print `0`.

- [ ] **Step 9: Commit.**

```bash
git add src/lib/data/services.ts worker/index.ts wrangler.jsonc tests/unit/quote-worker.test.ts
git commit -m "feat: quote API Worker (validation, Turnstile, Resend) and services data" -m "<trailer>"
```

(`<trailer>` = the two Global Constraints lines, verbatim.)

---

### Task 2: The `/services` page, result pages, home link and sitemap

**Files:**
- Create:
  - `src/routes/services/+page.svelte`
  - `src/routes/services/+page.ts`
  - `src/routes/services/sent/+page.svelte`
  - `src/routes/services/error/+page.svelte`
- Modify:
  - `src/lib/components/Hero.svelte` (one link after the contact nav)
  - `static/sitemap.xml`
  - `src/app.css` (a "Services" block)
  - `docs/superpowers/specs/2026-10-13-services-page-design.md` (the no-JS result pages ruling)
- Test: `tests/e2e/services.spec.ts`

**Interfaces:**
- Consumes: everything from `src/lib/data/services.ts` (Task 1); `profile.email` from `src/lib/data/site.ts`.
- Produces, for Task 3:
  - `form[data-quote]` with `action="/api/quote"`, `method="POST"`, `data-email`;
  - inside it: `[data-turnstile][data-sitekey]`, `[data-status]` and `[data-error-for="<field>"]`;
  - `button[type=submit]`;
  - package CTAs `a[data-need="<Need>"]` linking to `#quote`.

- [ ] **Step 1: Write the failing e2e tests.**

`tests/e2e/services.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { BUDGETS, CAL_URL, NEEDS, also, faq, packages } from '../../src/lib/data/services';

test('/services sells every package at its price, with local SEO', async ({ page }) => {
	await page.goto('/services');
	await expect(page).toHaveTitle(/Inland Empire/);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://yashnaj.dev/services');
	await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Corona.*Riverside.*Temecula/);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('half the agency price');
	for (const p of [...packages, ...also]) {
		const card = page.locator(`[data-package="${p.id}"]`);
		await expect(card).toContainText(p.name);
		await expect(card).toContainText(p.price);
	}
	await expect(page.locator('[data-package="website"]')).toContainText('$750');
	for (const f of faq) await expect(page.getByText(f.q)).toBeVisible();
	await expect(page.getByText(/pentest/i)).toHaveCount(0);
});

test('both calls to action work: quote form and a 15-minute call', async ({ page }) => {
	await page.goto('/services');
	await expect(page.getByRole('link', { name: 'Get a quote' }).first()).toHaveAttribute('href', '#quote');
	await expect(page.getByRole('link', { name: /Book a 15-min call/ }).first()).toHaveAttribute('href', CAL_URL);
	for (const p of packages) await expect(page.locator(`a[data-need="${p.id}"]`)).toHaveAttribute('href', '#quote');
});

test('the quote form posts to the API and offers every need and budget', async ({ page }) => {
	await page.goto('/services');
	const form = page.locator('form[data-quote]');
	await expect(form).toHaveAttribute('action', '/api/quote');
	await expect(form).toHaveAttribute('method', /post/i);
	for (const n of NEEDS) await expect(form.locator(`input[name="need"][value="${n.id}"]`)).toHaveCount(1);
	for (const b of BUDGETS) await expect(form.locator('select[name="budget"] option', { hasText: b })).toHaveCount(1);
	for (const f of ['name', 'email']) await expect(form.locator(`input[name="${f}"]`)).toHaveAttribute('required', '');
	await expect(form.locator('input[name="fax"]')).toHaveAttribute('tabindex', '-1');
	await expect(form.locator('[data-turnstile]')).toHaveAttribute('data-sitekey', /.+/);
});

test('without JavaScript the offer reads in full and the form points to email and a call', async ({ browser }) => {
	const ctx = await browser.newContext({ javaScriptEnabled: false });
	const page = await ctx.newPage();
	await page.goto('/services');
	await expect(page.locator('[data-package="website"]')).toContainText('$1,500');
	await expect(page.locator('form[data-quote] noscript')).toHaveCount(1);
	await ctx.close();
});

test('the no-JS result pages say what happened and are not indexed', async ({ page }) => {
	await page.goto('/services/sent');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Thanks');
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
	await page.goto('/services/error');
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
	await expect(page.getByRole('link', { name: 'yashnaj@proton.me' })).toHaveAttribute('href', 'mailto:yashnaj@proton.me');
	await expect(page.getByRole('link', { name: /Book a 15-min call/ })).toHaveAttribute('href', CAL_URL);
});

test('home links to services, and the sitemap lists it', async ({ page, request }) => {
	await page.goto('/');
	await expect(page.getByRole('link', { name: /Services for local businesses/ })).toHaveAttribute('href', '/services');
	expect(await (await request.get('/sitemap.xml')).text()).toContain('<loc>https://yashnaj.dev/services</loc>');
});

test('services is not a case-study landing (no fold transition marker)', async ({ page }) => {
	await page.goto('/services');
	await expect(page.locator('[data-vt-page]')).toHaveCount(0);
});
```

- [ ] **Step 2: Run them to check they fail.**

Run: `bunx playwright test services`

Expected: FAIL. `/services` is a 404, so the title doesn't match.

- [ ] **Step 3: Implement the page.**

`src/routes/services/+page.ts`:

```ts
// Static, no framework JS: quote.js (Task 3) is the only script.
export const csr = false;
```

`src/routes/services/+page.svelte`:

```svelte
<script lang="ts">
	import Footer from '$lib/components/Footer.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { profile } from '$lib/data/site';
	import { BUDGETS, CAL_URL, NEEDS, TURNSTILE_SITE_KEY, also, faq, packages, steps, why } from '$lib/data/services';
</script>

<Seo
	title="Website design & software for Inland Empire businesses — Yashal Najeeb"
	description="Fixed-price websites, online stores and tool automations for small businesses in Corona, Riverside, Temecula and the Inland Empire — about half the agency price, live in about a week."
	path="/services"
/>

<main class="mx-auto max-w-6xl px-4 md:px-8">
	<a href="/" class="mt-10 inline-block font-mono text-xs tracking-[0.3em] text-paper/80 uppercase hover:text-signal">← yashnaj.dev</a>

	<section aria-labelledby="services-title" class="pt-8 pb-12 md:pt-14 md:pb-16">
		<p class="font-mono text-xs tracking-[0.3em] text-signal uppercase">Services · Inland Empire</p>
		<h1 id="services-title" class="mt-4 max-w-4xl text-4xl leading-[1.02] font-semibold tracking-tight md:text-6xl">
			Websites and software for Inland Empire businesses — at half the agency price.
		</h1>
		<p class="mt-5 max-w-2xl text-lg text-paper/85 md:text-xl">
			Built by an engineer who has shipped four apps to the App Store and runs a platform holding $10M+ in assets. Fixed prices, real engineering.
		</p>
		<div class="mt-8 flex flex-wrap gap-3">
			<a class="btn-draft btn-signal" href="#quote">Get a quote</a>
			<a class="btn-draft" href={CAL_URL}>Book a 15-min call</a>
		</div>
	</section>

	<section id="packages" aria-labelledby="packages-heading" class="py-12">
		<div class="section-head" data-revealed><span data-n aria-hidden="true">01</span><h2 id="packages-heading">Packages</h2><span data-rule aria-hidden="true"></span></div>
		<div class="grid gap-6 md:grid-cols-3">
			{#each packages as p (p.id)}
				<article class="pkg relative flex flex-col border border-line-dim bg-ink/70 p-6" data-package={p.id}>
					<span class="sheet-corner" data-corner="tl" aria-hidden="true"></span>
					<span class="sheet-corner" data-corner="br" aria-hidden="true"></span>
					<h3 class="font-mono text-sm tracking-[0.25em] text-signal uppercase">{p.name}</h3>
					<p class="mt-4 text-4xl font-semibold tracking-tight">{p.price}</p>
					{#if p.note}<p class="mt-1 font-mono text-xs text-paper/75">{p.note}</p>{/if}
					<p class="mt-4 text-paper/90">{p.blurb}</p>
					<ul class="mt-5 grid gap-2 font-mono text-sm text-paper/85">
						{#each p.includes as item}<li class="flex gap-2"><span class="text-signal" aria-hidden="true">+</span>{item}</li>{/each}
					</ul>
					<div class="mt-auto pt-6"><a class="btn-draft w-full text-center" href="#quote" data-need={p.id}>Get a quote</a></div>
				</article>
			{/each}
		</div>
	</section>

	<section aria-labelledby="also-heading" class="py-12">
		<div class="section-head" data-revealed><span data-n aria-hidden="true">02</span><h2 id="also-heading">Also available</h2><span data-rule aria-hidden="true"></span></div>
		<div class="grid gap-px border border-line-dim bg-line-dim md:grid-cols-3">
			{#each also as p (p.id)}
				<div class="bg-ink p-5" data-package={p.id}>
					<h3 class="font-semibold">{p.name}</h3>
					<p class="mt-1 font-mono text-sm text-signal">{p.price}</p>
					<p class="mt-3 text-sm text-paper/85">{p.blurb}</p>
				</div>
			{/each}
		</div>
	</section>

	<section aria-labelledby="why-heading" class="py-12">
		<div class="section-head" data-revealed><span data-n aria-hidden="true">03</span><h2 id="why-heading">Why me</h2><span data-rule aria-hidden="true"></span></div>
		<div class="grid gap-8 md:grid-cols-3">
			{#each why as w}
				<div><h3 class="text-xl font-semibold">{w.title}</h3><p class="mt-2 text-paper/85">{w.body}</p></div>
			{/each}
		</div>
		<p class="mt-8 font-mono text-sm"><a class="link-sweep" href="/#work">See the work →</a></p>
	</section>

	<section aria-labelledby="how-heading" class="py-12">
		<div class="section-head" data-revealed><span data-n aria-hidden="true">04</span><h2 id="how-heading">How it works</h2><span data-rule aria-hidden="true"></span></div>
		<ol class="grid gap-8 md:grid-cols-3">
			{#each steps as s, i}
				<li><p class="font-mono text-xs tracking-[0.3em] text-signal">STEP {i + 1}</p><h3 class="mt-2 text-xl font-semibold">{s.title}</h3><p class="mt-2 text-paper/85">{s.body}</p></li>
			{/each}
		</ol>
	</section>

	<section aria-labelledby="faq-heading" class="py-12">
		<div class="section-head" data-revealed><span data-n aria-hidden="true">05</span><h2 id="faq-heading">Questions</h2><span data-rule aria-hidden="true"></span></div>
		<div class="grid gap-3">
			{#each faq as f}
				<details class="faq border border-line-dim bg-ink/70 px-5 py-4"><summary class="cursor-pointer font-semibold">{f.q}</summary><p class="mt-3 text-paper/85">{f.a}</p></details>
			{/each}
		</div>
	</section>

	<section id="quote" aria-labelledby="quote-heading" class="py-12">
		<div class="section-head" data-revealed><span data-n aria-hidden="true">06</span><h2 id="quote-heading">Get a quote</h2><span data-rule aria-hidden="true"></span></div>
		<div class="grid gap-10 md:grid-cols-[1fr_18rem]">
			<form method="POST" action="/api/quote" class="quote grid gap-5" data-quote data-email={profile.email}>
				<div class="grid gap-5 sm:grid-cols-2">
					<label class="field">Your name<input name="name" autocomplete="name" required maxlength="100" /><span class="field-error" data-error-for="name"></span></label>
					<label class="field">Business<input name="business" autocomplete="organization" maxlength="100" /><span class="field-error" data-error-for="business"></span></label>
					<label class="field">Email<input name="email" type="email" autocomplete="email" required maxlength="200" /><span class="field-error" data-error-for="email"></span></label>
					<label class="field">Phone (optional)<input name="phone" type="tel" autocomplete="tel" maxlength="40" /><span class="field-error" data-error-for="phone"></span></label>
				</div>
				<fieldset class="field">
					<legend>What do you need?</legend>
					<div class="mt-2 flex flex-wrap gap-2">
						{#each NEEDS as n}<label class="chip"><input type="checkbox" name="need" value={n.id} />{n.label}</label>{/each}
					</div>
					<span class="field-error" data-error-for="need"></span>
				</fieldset>
				<label class="field">Budget
					<select name="budget"><option value="">Choose a range</option>{#each BUDGETS as b}<option>{b}</option>{/each}</select>
					<span class="field-error" data-error-for="budget"></span>
				</label>
				<label class="field">Tell me about it<textarea name="message" rows="5" maxlength="5000"></textarea><span class="field-error" data-error-for="message"></span></label>
				<div class="hp" aria-hidden="true"><label>Fax<input name="fax" tabindex="-1" autocomplete="off" /></label></div>
				<div class="turnstile" data-turnstile data-sitekey={TURNSTILE_SITE_KEY}></div>
				<noscript><p class="font-mono text-sm text-paper/85">This form needs JavaScript for its spam check. Email <a class="link-sweep" href="mailto:{profile.email}">{profile.email}</a> or <a class="link-sweep" href={CAL_URL}>book a 15-min call</a>.</p></noscript>
				<div class="flex flex-wrap items-center gap-4">
					<button class="btn-draft btn-signal" type="submit">Send request</button>
					<p class="status font-mono text-sm" data-status role="status" aria-live="polite"></p>
				</div>
			</form>
			<aside class="grid content-start gap-4 font-mono text-sm">
				<p class="text-paper/85">Prefer to talk?</p>
				<a class="btn-draft text-center" href={CAL_URL}>Book a 15-min call</a>
				<a class="link-sweep w-fit" href="mailto:{profile.email}">{profile.email}</a>
				<p class="text-paper/70">{profile.location} · replies within 24 hours</p>
			</aside>
		</div>
	</section>
</main>

<div class="mx-auto max-w-6xl px-4 md:px-8"><Footer /></div>
```

`src/routes/services/sent/+page.svelte`:

```svelte
<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
</script>

<Seo title="Request sent — Yashal Najeeb" description="Your quote request was sent." path="/services/sent" noindex />

<main class="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4">
	<p class="font-mono text-xs tracking-[0.3em] text-signal uppercase">Quote request</p>
	<h1 class="mt-4 text-5xl font-semibold">Thanks — it’s in.</h1>
	<p class="mt-4 text-paper/85">I’ll reply within 24 hours.</p>
	<a class="btn-draft mt-8 w-fit" href="/services">Back to services</a>
</main>
```

`src/routes/services/error/+page.svelte`:

```svelte
<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { CAL_URL } from '$lib/data/services';
	import { profile } from '$lib/data/site';
</script>

<Seo title="Couldn’t send — Yashal Najeeb" description="Your quote request couldn’t be sent." path="/services/error" noindex />

<main class="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4">
	<p class="font-mono text-xs tracking-[0.3em] text-signal uppercase">Quote request</p>
	<h1 class="mt-4 text-5xl font-semibold">That didn’t send.</h1>
	<p class="mt-4 text-paper/85">The form needs JavaScript for its spam check, or something went wrong on my side. Reach me directly:</p>
	<p class="mt-6 flex flex-wrap gap-4 font-mono text-sm">
		<a class="link-sweep" href="mailto:{profile.email}">{profile.email}</a>
		<a class="link-sweep" href={CAL_URL}>Book a 15-min call</a>
	</p>
	<a class="btn-draft mt-8 w-fit" href="/services">Back to services</a>
</main>
```

**Home link.** In `src/lib/components/Hero.svelte`, directly after the closing `</nav>` (inside `.hero-body`), add:

```svelte
		<p data-enter style="--e: 5" class="mt-5 font-mono text-sm"><a class="link-sweep" href="/services">Services for local businesses →</a></p>
```

**Sitemap.** In `static/sitemap.xml`, before `</urlset>`, add:

```xml
	<url><loc>https://yashnaj.dev/services</loc><lastmod>2026-10-13</lastmod></url>
```

**CSS.** Append to `src/app.css`, before `/* ---------- Hero layout`:

```css
/* ---------- Services ---------- */
.quote .field { display: grid; gap: 0.4rem; font-family: var(--font-mono); font-size: 0.8rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgb(242 234 216 / 0.8); }
.quote :is(input:not([type='checkbox']), select, textarea) { width: 100%; border: 1px solid var(--color-line-dim); background: var(--color-ink); padding: 0.65rem 0.75rem; font-family: var(--font-sans); font-size: 1rem; letter-spacing: normal; text-transform: none; color: var(--color-paper); }
.quote :is(input, select, textarea):focus-visible { outline: 2px solid var(--color-signal); outline-offset: 1px; }
.quote .chip { display: inline-flex; align-items: center; gap: 0.45rem; border: 1px solid var(--color-line-dim); padding: 0.45rem 0.7rem; cursor: pointer; text-transform: none; letter-spacing: normal; font-size: 0.875rem; color: var(--color-paper); }
.quote .chip:has(input:checked) { border-color: var(--color-signal); color: var(--color-signal); }
.quote .chip input { accent-color: var(--color-signal); }
.quote .field-error { min-height: 1em; color: var(--color-signal); text-transform: none; letter-spacing: normal; }
.quote .hp { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
/* reserve the widget's height so it can't shift the page when it appears */
.quote .turnstile { min-height: 65px; }
.quote .status[data-kind='ok'] { color: var(--color-signal); }
.faq summary::marker { color: var(--color-signal); }
```

**Spec amendment.** In `docs/superpowers/specs/2026-10-13-services-page-design.md`, change the no-JS response line under "Respond" to:

> **No-JS form post:** a 303 redirect to the static pages `/services/sent` or `/services/error` (noindex). A pre-rendered page can't read a query string without JS.

- [ ] **Step 4: Run the tests to check they pass.**

Run: `bunx playwright test services hero layout`

Expected: PASS. The hero/layout specs confirm the new home link didn't break the hero (if a hero test counts nav links or checks the actions' position, adjust only that assertion and ledger it).

- [ ] **Step 5: Screenshot check (visual, no new tests).** Take full-page screenshots of `/services` at 390×844 and 1280×800, plus home's first screen at 390×844 (the new link must not push the actions below the fold on a 16 Pro Max-sized viewport, 440×956). Fix only what's clearly wrong: overlap, overflow, unreadable contrast.

- [ ] **Step 6: Run the leak check (its own step).** Both greps must print `0`.

- [ ] **Step 7: Commit.**

```bash
git add src/routes/services src/lib/components/Hero.svelte static/sitemap.xml src/app.css tests/e2e/services.spec.ts docs/superpowers/specs/2026-10-13-services-page-design.md
git commit -m "feat: /services page (packages, FAQ, quote form), result pages, home link, sitemap" -m "<trailer>"
```

---

### Task 3: In-page submit and lazy Turnstile (`quote.js`)

**Files:**
- Create: `src/lib/client/quote.js`
- Modify:
  - `src/routes/services/+page.svelte` (load the script)
  - `vite.config.ts` (minify `quote` like the other client scripts)
  - `tests/unit/budget.test.ts` (a `/services` budget)
- Test: `tests/e2e/services.spec.ts` (append)

**Interfaces:**
- Consumes: Task 2's form hooks, and Task 1's wire contract.
- Produces: `window.onTurnstileLoad` (the global Turnstile calls back on load).

- [ ] **Step 1: Write the failing e2e tests.** Append to `tests/e2e/services.spec.ts`:

```ts
import type { Page, Route } from '@playwright/test';

// A stand-in for Cloudflare's script: renders the hidden token input Turnstile adds to the form.
const FAKE_TURNSTILE = `window.turnstile = { render(el) { const i = document.createElement('input'); i.type = 'hidden'; i.name = 'cf-turnstile-response'; i.value = 'tok'; el.appendChild(i); }, reset() {} }; window.onTurnstileLoad && window.onTurnstileLoad();`;

async function stubTurnstile(page: Page, mode: 'ok' | 'blocked' = 'ok') {
	const hits: string[] = [];
	await page.route('https://challenges.cloudflare.com/**', (r: Route) => {
		hits.push(r.request().url());
		return mode === 'ok' ? r.fulfill({ contentType: 'application/javascript', body: FAKE_TURNSTILE }) : r.abort();
	});
	return hits;
}
async function fillQuote(page: Page) {
	await page.locator('#quote').scrollIntoViewIfNeeded();
	await page.fill('input[name="name"]', 'Ana Ruiz');
	await page.fill('input[name="email"]', 'ana@example.com');
	await page.locator('label.chip', { hasText: 'Website' }).click();
	await page.fill('textarea[name="message"]', 'Need a site\nfor my taqueria');
}

test('Turnstile loads only when the form comes near', async ({ page }) => {
	const hits = await stubTurnstile(page);
	await page.goto('/services');
	await page.waitForTimeout(500);
	expect(hits).toHaveLength(0);
	await page.locator('#quote').scrollIntoViewIfNeeded();
	await expect.poll(() => hits.length).toBe(1);
	await expect(page.locator('[data-turnstile] input[name="cf-turnstile-response"]')).toHaveCount(1);
});

test('a package button preselects that need', async ({ page }) => {
	await stubTurnstile(page);
	await page.goto('/services');
	await page.locator('a[data-need="store"]').click();
	await expect(page.locator('input[name="need"][value="store"]')).toBeChecked();
});

test('a successful send thanks the visitor and clears the form', async ({ page }) => {
	await stubTurnstile(page);
	let posted = '';
	await page.route('**/api/quote', (r) => {
		posted = r.request().postData() ?? '';
		return r.fulfill({ json: { ok: true } });
	});
	await page.goto('/services');
	await fillQuote(page);
	await page.click('button[type="submit"]');
	await expect(page.locator('[data-status]')).toHaveText('Thanks — I’ll reply within 24 hours.');
	await expect(page.locator('input[name="name"]')).toHaveValue('');
	expect(posted).toContain('cf-turnstile-response');
	expect(posted).toContain('ana@example.com');
	expect(posted).toContain('website');
});

test('server validation errors appear next to their fields', async ({ page }) => {
	await stubTurnstile(page);
	await page.route('**/api/quote', (r) => r.fulfill({ status: 400, json: { ok: false, error: 'invalid', fields: { email: 'Enter a valid email.' } } }));
	await page.goto('/services');
	await fillQuote(page);
	await page.click('button[type="submit"]');
	await expect(page.locator('[data-error-for="email"]')).toHaveText('Enter a valid email.');
	await expect(page.locator('input[name="name"]')).toHaveValue('Ana Ruiz');
});

for (const [label, handler] of [
	['the email service fails', (r: Route) => r.fulfill({ status: 502, json: { ok: false, error: 'send' } })],
	['the network is down', (r: Route) => r.abort()]
] as const) {
	test(`when ${label}, the visitor gets a prefilled email instead`, async ({ page }) => {
		await stubTurnstile(page);
		await page.route('**/api/quote', handler);
		await page.goto('/services');
		await fillQuote(page);
		await page.click('button[type="submit"]');
		const mail = page.locator('[data-status] a[href^="mailto:yashnaj@proton.me"]');
		await expect(mail).toBeVisible();
		expect(decodeURIComponent((await mail.getAttribute('href'))!)).toContain('Need a site\nfor my taqueria');
	});
}

test('turnstile blocked: the send ends in the email fallback, not a hang', async ({ page }) => {
	await stubTurnstile(page, 'blocked');
	await page.route('**/api/quote', (r) => r.fulfill({ status: 403, json: { ok: false, error: 'turnstile' } }));
	await page.goto('/services');
	await fillQuote(page);
	await page.click('button[type="submit"]');
	await expect(page.locator('[data-status]')).toContainText('spam check');
	await expect(page.locator('[data-status] a[href^="mailto:"]')).toBeVisible();
	await expect(page.locator('button[type="submit"]')).toBeEnabled();
});

test('a double click sends one request', async ({ page }) => {
	await stubTurnstile(page);
	let n = 0;
	await page.route('**/api/quote', async (r) => {
		n++;
		await new Promise((f) => setTimeout(f, 300));
		return r.fulfill({ json: { ok: true } });
	});
	await page.goto('/services');
	await fillQuote(page);
	await page.locator('button[type="submit"]').dblclick();
	await expect(page.locator('[data-status]')).toContainText('Thanks');
	expect(n).toBe(1);
});
```

Move the `import type { Page, Route }` line to the top of the file, next to the existing imports.

- [ ] **Step 2: Run them to check they fail.**

Run: `bunx playwright test services`

Expected: the new tests FAIL. No script loads Turnstile, and a submit does a full-page POST to `/api/quote`, which is 404 in `vite preview`.

- [ ] **Step 3: Implement `src/lib/client/quote.js`.**

```js
// @ts-nocheck — plain browser script, served as-is
// Quote form: send in place, show the result inline, never lose a lead. Turnstile loads only near the form.
(() => {
	const form = document.querySelector('[data-quote]');
	if (!form) return;
	const status = form.querySelector('[data-status]');
	const box = form.querySelector('[data-turnstile]');
	const btn = form.querySelector('button[type="submit"]');
	const email = form.dataset.email;

	// package buttons preselect what the visitor asked about
	document.querySelectorAll('a[data-need]').forEach((a) =>
		a.addEventListener('click', () => {
			const c = form.querySelector(`input[name="need"][value="${a.dataset.need}"]`);
			if (c) c.checked = true;
		})
	);

	let loading = false;
	const load = () => {
		if (loading) return;
		loading = true;
		window.onTurnstileLoad = () => window.turnstile.render(box, { sitekey: box.dataset.sitekey, theme: 'dark' });
		const s = document.createElement('script');
		s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
		s.async = true;
		document.head.appendChild(s);
	};
	if ('IntersectionObserver' in window) {
		const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && (io.disconnect(), load()), { rootMargin: '400px' });
		io.observe(form);
	} else load();
	form.addEventListener('focusin', load);

	const say = (parts, kind) => {
		status.dataset.kind = kind;
		status.replaceChildren(...parts);
	};
	const mailto = () => {
		const d = new FormData(form);
		const body = [`Name: ${d.get('name')}`, `Business: ${d.get('business')}`, `Phone: ${d.get('phone')}`, `Needs: ${d.getAll('need').join(', ')}`, `Budget: ${d.get('budget')}`, '', d.get('message')].join('\n');
		const a = document.createElement('a');
		a.href = `mailto:${email}?subject=${encodeURIComponent('Quote request')}&body=${encodeURIComponent(body)}`;
		a.className = 'link-sweep';
		a.textContent = `email me at ${email}`;
		return a;
	};

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (btn.disabled) return;
		btn.disabled = true;
		form.querySelectorAll('[data-error-for]').forEach((p) => (p.textContent = ''));
		say(['Sending…'], 'busy');
		let res = null;
		try {
			const r = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { accept: 'application/json' } });
			res = await r.json();
		} catch (_) {}
		btn.disabled = false;
		const resetCheck = () => window.turnstile && window.turnstile.reset(box);
		if (res && res.ok) {
			form.reset();
			resetCheck();
			return say(['Thanks — I’ll reply within 24 hours.'], 'ok');
		}
		if (res && res.error === 'invalid' && res.fields) {
			for (const [k, m] of Object.entries(res.fields)) {
				const p = form.querySelector(`[data-error-for="${k}"]`);
				if (p) p.textContent = m;
			}
			return say(['Please fix the highlighted fields.'], 'error');
		}
		resetCheck();
		if (res && res.error === 'turnstile') return say(['The spam check didn’t pass. Try again, or ', mailto(), '.'], 'error');
		say(['Couldn’t send just now — ', mailto(), ' (your message is filled in).'], 'error');
	});
})();
```

- [ ] **Step 4: Load and minify it.**

In `src/routes/services/+page.svelte`, add to the `<script>` block:

```ts
	import quoteUrl from '$lib/client/quote.js?url';
```

Then, right after `<Seo … />`, add:

```svelte
<svelte:head><script src={quoteUrl} defer></script></svelte:head>
```

In `vite.config.ts`, change the minify regex `/\/(enhance|carousel|models)\.[\w-]+\.js$/` to `/\/(enhance|carousel|models|quote)\.[\w-]+\.js$/`.

- [ ] **Step 5: Add the `/services` JS budget.** In `tests/unit/budget.test.ts`, append:

```ts
describe('services page JS budget', () => {
	it('/services ships under 4 KB gzipped first-party JS', () => {
		const html = readFileSync('build/services.html', 'utf8');
		const urls = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
		expect(urls.some((u) => /quote[.-][\w-]+\.js$/.test(u))).toBe(true);
		let total = gzipSync(html.match(/<script>[\s\S]*?<\/script>/g)?.join('') ?? '').length;
		for (const u of urls) total += gzipSync(readFileSync(join('build', u.replace(/^\.?\//, '')))).length;
		expect(total).toBeLessThan(4 * 1024);
	});
});
```

- [ ] **Step 6: Run the tests to check they pass.**

Run: `bunx playwright test services && bunx vitest run`

Expected: PASS. The budget test reads the build Playwright just made.

- [ ] **Step 7: Run the leak check (its own step).** Both greps must print `0`.

- [ ] **Step 8: Commit.**

```bash
git add src/lib/client/quote.js src/routes/services/+page.svelte vite.config.ts tests/unit/budget.test.ts tests/e2e/services.spec.ts
git commit -m "feat: quote form sends in place with a lazy spam check and an email fallback" -m "<trailer>"
```

---

### Task 4: Full suite, final review, screenshot gate

**Files:** none new.

- [ ] **Step 1: Run the full suite.**

Run: `bun run test && bun run check`

Expected: everything passes, with 0 svelte-check errors. Record the `/services` JS byte count in the ledger.

- [ ] **Step 2: Run the final whole-branch review** (the executing-plans skill's Final Review), on the most capable model. Re-grade its findings, fix Critical and Important ones with TDD, and ledger the minors.

- [ ] **Step 3: Visual gate.**
  - Capture `/services` full-page screenshots at 390×844 and 1280×800, plus home's first screen on a phone, and save them to the scratchpad.
  - Send them to the user with SendUserFile.
  - In the same message, ask the user to **confirm the Cal.com link** (`https://cal.com/yashnaj/15min`, assumed).
  - **Stop and wait for their OK.** If they correct the Cal.com link, edit `CAL_URL` and re-run `bunx playwright test services`, then run the leak check and commit (`fix: real Cal.com link`).

---

### Task 5: Accounts, secrets, ship, verify (after the user's OK only)

Every step here touches the user's accounts or production. Do them in order and stop at each `!` hand-off until the user confirms it ran.

- [ ] **Step 1: Resend domain** (Chrome, the user's logged-in Resend; load the claude-in-chrome tools first).
  1. Open `https://resend.com/domains` and add the domain `yashnaj.dev` (region: US East).
  2. Read the DNS records Resend shows. Expect three: an MX on `send`, a TXT (SPF) on `send`, and a TXT (DKIM) on `resend._domainkey`. **None may touch the root MX, SPF, DMARC or Proton's DKIM CNAMEs.** If any would, stop and tell the user.

- [ ] **Step 2: DNS hand-off.**
  - The project has a Wrangler config, but Wrangler can't manage DNS. Use the `cf` CLI: check the exact syntax with `cf dns --help` (record type, name, content, priority for MX, TTL auto, proxied off).
  - Write one `! cf dns …` command per record, using zone ID `7d4d4f5c55f0806b6381cc4343ac78c1`.
  - Give the user the commands, saying up front that the safety check, not you, blocks DNS changes.
  - After they run, click **Verify** in Resend and wait until the domain shows *Verified*.

- [ ] **Step 3: Resend key.**
  1. In Resend → API Keys, create `yashnaj-dev-quotes` with permission **Sending access**, domain `yashnaj.dev`.
  2. Don't read the key aloud or copy it anywhere. Tell the user to copy it from the dialog and run:
     ```
     ! bunx wrangler secret put RESEND_API_KEY
     ```
     The user pastes the key at the prompt.

- [ ] **Step 4: Turnstile.**
  1. In the Cloudflare dashboard (Chrome) → Turnstile, add a widget `yashnaj.dev quotes` for hostname `yashnaj.dev`, mode **Managed**.
  2. Put the **site key** (public) in `TURNSTILE_SITE_KEY` in `src/lib/data/services.ts`.
  3. Run `bunx playwright test services` (the tests stub Turnstile, so they stay green), then the leak check, then commit (`feat: live Turnstile site key`).
  4. Tell the user to copy the **secret key** and run:
     ```
     ! bunx wrangler secret put TURNSTILE_SECRET
     ```

- [ ] **Step 5: Ship.**
  1. `git checkout main && git merge --ff-only feat/services`
  2. Then, as its own step: `git push origin main`. Cloudflare Workers Builds deploys it.
  3. Poll `https://yashnaj.dev/services` until it returns 200 with the page title.
  4. `curl -s -o /dev/null -w '%{http_code}' https://yashnaj.dev/api/quote` must print `405` (the Worker is live).
  5. `curl -sI https://yashnaj.dev/work/myne | head -1` must print `200` (static assets are still served).

- [ ] **Step 6: Send a real test quote** (the user authorised one).
  1. In Chrome, open `https://yashnaj.dev/services`.
  2. Fill: name `Test — Claude`, business `Launch check`, email `yashnaj@proton.me`, need *Website*, message `Launch test, please ignore.`
  3. Complete Turnstile if it asks for a click. If it shows a challenge Claude may not solve, ask the user to click it.
  4. Submit, and confirm the status reads "Thanks — I'll reply within 24 hours."
  5. Ask the user to confirm the email arrived in Proton and that **Reply** addresses `yashnaj@proton.me`.

- [ ] **Step 7: Run Lighthouse.** Mobile, three runs each on `/services` and `/`, using `npx -y lighthouse@12.8.2` (not `bunx`):

```bash
npx -y lighthouse@12.8.2 https://yashnaj.dev/services --quiet --chrome-flags="--headless=new" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=<scratch>/lh-services-<n>.json
```

Report every score. Targets: `/services` ≥ 95, home 100. Production LCP jitters between runs, so if a target misses, A/B locally against the pre-branch commit before calling it a regression: build the old commit in its own worktree and run `vite preview` from inside that worktree.
