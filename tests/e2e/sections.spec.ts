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
