import { expect, test } from '@playwright/test';

test('home renders the name as the only h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toHaveCount(1);
	await expect(page.locator('h1')).toContainText('Yashal Najeeb');
	await expect(page.locator('html')).toHaveClass(/\bjs\b/);
});

test('hero shows role, pitch, photo and contact actions', async ({ page }) => {
	await page.goto('/');
	const hero = page.getByTestId('hero');
	await expect(hero).toContainText('Full-Stack Product Engineer');
	await expect(hero).toContainText('$10M+');
	await expect(hero.getByTestId('availability')).toContainText(/open to/i);
	const img = hero.getByRole('img', { name: 'Portrait of Yashal Najeeb' });
	await expect(img).toBeVisible();
	expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
	await expect(hero.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '/Yashal-Najeeb-Resume.pdf');
	await expect(hero.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/YashNaj');
	await expect(hero.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/yashnaj');
	await expect(hero.getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:yashnaj@proton.me');
});

test('PRESS START teaser is hidden until phase 2 ships', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('press-start')).toHaveCount(0);
});

test('the hero is a labelled section, not a header inside main', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('main header')).toHaveCount(0);
	await expect(page.getByRole('region', { name: 'Yashal Najeeb' })).toHaveAttribute('data-testid', 'hero');
});

test('hero secondary elements enter; the h1 and photo never animate (LCP)', async ({ page }) => {
	await page.goto('/');
	expect(await page.locator('h1').evaluate((el) => el.getAnimations().length)).toBe(0);
	expect(await page.locator('[data-testid="hero"] img').evaluate((el) => el.getAnimations().length)).toBe(0);
	expect(await page.locator('[data-enter]').count()).toBeGreaterThanOrEqual(4); // the portrait is a frameless plate
	expect(await page.locator('[data-enter]').first().evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
	expect(await page.getByTestId('availability').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
});

test('reduced motion: hero is static', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	expect(await page.getByTestId('hero').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
});

test('on a phone the pitch is the LCP, so it never animates either', async ({ browser }) => {
	const ctx = await browser.newContext({ viewport: { width: 412, height: 823 } });
	const page = await ctx.newPage();
	await page.goto('/');
	const pitch = page.locator('[data-testid="hero"] p', { hasText: 'I take products from zero' });
	expect(await pitch.evaluate((el) => el.getAnimations().length)).toBe(0);
	expect(await pitch.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
	await ctx.close();
});
