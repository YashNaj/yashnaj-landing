import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
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
