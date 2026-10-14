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
