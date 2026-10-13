import { expect, test } from '@playwright/test';

test('also built lists four smaller projects', async ({ page }) => {
	await page.goto('/');
	const section = page.locator('#also-built');
	await expect(section.getByRole('heading', { level: 2 })).toHaveText('Also built');
	await expect(section.locator('li strong')).toHaveText(['Serveus', 'Rider365', 'AutoAce', 'FieldDiligence']);
	await expect(section.getByRole('link', { name: /Serveus/ })).toHaveAttribute('href', /apps\.apple\.com/);
	await expect(section.getByRole('link', { name: /Rider365/ })).toHaveAttribute('href', /apps\.apple\.com/);
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
	await expect(footer.locator('dd').filter({ hasText: '2026 Yashal Najeeb' })).toHaveCount(1);
	expect((await footer.textContent())!.match(/2026 Yashal Najeeb/g)).toHaveLength(1);
});

test('unknown paths render the blueprint 404 with a way home', async ({ page }) => {
	await page.goto('/does-not-exist');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
	await expect(page.getByRole('link', { name: /back to/i })).toHaveAttribute('href', '/');
});

test('project sheets are drafting frames whose corners extend on hover', async ({ page }) => {
	await page.goto('/');
	const sheet = page.locator('#myne');
	await expect(sheet.locator('[data-corner]')).toHaveCount(4);
	await expect(sheet.locator('.sheet-tb > span')).toHaveText(['SHEET 02 / 04', 'SCALE 1:1', 'REV 26']);
	const corner = sheet.locator('[data-corner="tl"]');
	const before = await corner.evaluate((c) => c.getBoundingClientRect().width);
	await sheet.hover();
	await expect.poll(() => corner.evaluate((c) => c.getBoundingClientRect().width)).toBeGreaterThan(before);
});

test('primary actions share the drafting button style', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('[data-testid="hero"] nav a.btn-draft')).toHaveCount(4);
	await expect(page.locator('#chauffeur a.btn-draft', { hasText: 'View project' })).toHaveCount(1);
});

test('section heads number themselves and their rule draws in', async ({ page }) => {
	await page.goto('/');
	const head = page.locator('.section-head', { has: page.getByRole('heading', { name: 'Experience' }) });
	await head.scrollIntoViewIfNeeded();
	await expect(head).toHaveAttribute('data-revealed', '');
	await expect(head.locator('[data-n]')).toHaveText('03');
});
