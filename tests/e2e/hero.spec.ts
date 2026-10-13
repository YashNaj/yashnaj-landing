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
