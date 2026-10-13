import { expect, test } from '@playwright/test';
import { scrubTo, sp, timedMode } from './helpers';

/** Extra scroll room the pin adds below the sheet (0 when not pinned). */
const pinExtra = (page: import('@playwright/test').Page, slug = 'myne') =>
	page.locator(`#${slug}`).evaluate((a) => a.parentElement!.getBoundingClientRect().height - a.getBoundingClientRect().height);

const sheetTop = (page: import('@playwright/test').Page) =>
	page.locator('#myne').evaluate((a) => a.getBoundingClientRect().top);

test.describe('scrub switch', () => {
	test('is on in a capable browser with motion allowed', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('html')).toHaveClass(/\bscrub\b/);
	});
	test('is off with reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await expect(page.locator('html')).not.toHaveClass(/\bscrub\b/);
	});
	test('is off without scroll-driven animations', async ({ page }) => {
		await timedMode(page);
		await page.goto('/');
		await expect(page.locator('html')).not.toHaveClass(/\bscrub\b/);
	});
	test('is off on a return trip ("All work")', async ({ page }) => {
		await page.goto('/work/chauffeur');
		await page.getByRole('link', { name: /All work/ }).click();
		await expect(page.locator('html')).toHaveClass(/\brestored\b/);
		await expect(page.locator('html')).not.toHaveClass(/\bscrub\b/);
	});
});

test.describe('pin', () => {
	test('desktop: the sheet holds still while --sp runs 0 → 100', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/');
		const tops: number[] = [];
		for (const p of [0, 50, 100]) {
			await scrubTo(page, 'myne', p);
			await expect.poll(() => sp(page, 'myne')).toBeCloseTo(p, -1); // within ±5
			tops.push(await sheetTop(page));
		}
		expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
		expect(tops[0]).toBeCloseTo(90, 0); // pinned at 10vh
		expect(await pinExtra(page)).toBeCloseTo(450, 0); // 50vh of pinned scroll
	});
	test('phone: no pin, no extra space, --sp still runs 0 → 100', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/');
		expect(await pinExtra(page)).toBeLessThan(1);
		await scrubTo(page, 'myne', 0);
		await expect.poll(() => sp(page, 'myne')).toBeLessThan(5);
		const t0 = await sheetTop(page);
		await scrubTo(page, 'myne', 100);
		await expect.poll(() => sp(page, 'myne')).toBeGreaterThan(95);
		expect(t0 - (await sheetTop(page))).toBeGreaterThan(300);
	});
	test('wide but short window (1366×700): no pin', async ({ page }) => {
		await page.setViewportSize({ width: 1366, height: 700 });
		await page.goto('/');
		expect(await pinExtra(page)).toBeLessThan(1);
		expect(await page.locator('#myne').evaluate((a) => getComputedStyle(a).position)).not.toBe('sticky');
		await scrubTo(page, 'myne', 100);
		await expect.poll(() => sp(page, 'myne')).toBeGreaterThan(95);
	});
	test('resizing across the desktop threshold never strands a sheet', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/');
		await scrubTo(page, 'myne', 50);
		await page.setViewportSize({ width: 600, height: 900 });
		await expect.poll(() => page.locator('#myne').evaluate((a) => getComputedStyle(a).position)).not.toBe('sticky');
		const v = await sp(page, 'myne');
		expect(v).toBeGreaterThanOrEqual(0);
		expect(v).toBeLessThanOrEqual(100);
		await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
		await expect.poll(() => sp(page, 'myne')).toBe(100);
	});
});
