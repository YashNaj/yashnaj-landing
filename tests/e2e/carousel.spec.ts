import { expect, test } from '@playwright/test';

test('buttons, keys and dots move the active slide and counter', async ({ page }) => {
	await page.goto('/work/myne');
	const c = page.locator('[data-carousel]');
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 01 / 05');
	await c.locator('[data-next]').click();
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 02 / 05');
	await c.locator('[data-track]').focus();
	await page.keyboard.press('ArrowRight');
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 03 / 05');
	await c.locator('[data-dot]').nth(4).click();
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 05 / 05');
	await expect(c.locator('[data-dot]').nth(4)).toHaveAttribute('aria-current', 'true');
});

test('ends are clamped: prev on first and next on last stay put without errors', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto('/work/myne');
	const c = page.locator('[data-carousel]');
	await c.locator('[data-prev]').click();
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 01 / 05');
	await c.locator('[data-dot]').nth(4).click();
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 05 / 05');
	await c.locator('[data-next]').click();
	await page.waitForTimeout(500);
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 05 / 05');
	expect(errors).toEqual([]);
});

test('without JS every slide is present and controls stay hidden', async ({ browser }) => {
	const ctx = await browser.newContext({ javaScriptEnabled: false });
	const page = await ctx.newPage();
	await page.goto('/work/myne');
	await expect(page.locator('[data-slide]')).toHaveCount(5);
	await expect(page.locator('[data-controls]')).toBeHidden();
	await ctx.close();
});

test('videos do not load until their slide is visible, then play', async ({ page }) => {
	await page.goto('/work/chauffeur');
	const videos = page.locator('[data-carousel] video');
	await expect(videos.nth(2)).toHaveAttribute('preload', 'none');
	expect(await videos.nth(2).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
	await page.locator('[data-carousel]').scrollIntoViewIfNeeded();
	await expect.poll(() => videos.nth(0).evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 5000 }).toBe(true);
	expect(await videos.nth(2).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});

test('reduced motion: videos never autoplay and show controls', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/work/chauffeur');
	await page.locator('[data-carousel]').scrollIntoViewIfNeeded();
	await page.waitForTimeout(800);
	const v = page.locator('[data-carousel] video').first();
	expect(await v.evaluate((el: HTMLVideoElement) => el.paused)).toBe(true);
	await expect(v).toHaveAttribute('controls', '');
});

test('carousel does not cause horizontal page overflow at 360px', async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 800 });
	await page.goto('/work/hard-pills');
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
	expect(overflow).toBeLessThanOrEqual(0);
	const offenders = await page.evaluate(() =>
		[...document.querySelectorAll('body *')]
			.filter((el) => !el.closest('[data-track], [aria-hidden="true"], .sr-only, svg'))
			.filter((el) => el.getBoundingClientRect().right > window.innerWidth + 0.5)
			.map((el) => el.outerHTML.slice(0, 80))
	);
	expect(offenders).toEqual([]);
});
