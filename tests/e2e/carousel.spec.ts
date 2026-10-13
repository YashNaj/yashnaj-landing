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

test('the labelled scroller has a role so its name is valid ARIA', async ({ page }) => {
	await page.goto('/work/myne');
	await expect(page.locator('[data-track]')).toHaveAttribute('role', 'group');
});

test('dots have a touch target of at least 24×24', async ({ page }) => {
	await page.goto('/work/myne');
	for (const dot of await page.locator('[data-dot]').all()) {
		const box = (await dot.boundingBox())!;
		expect(box.width).toBeGreaterThanOrEqual(24);
		expect(box.height).toBeGreaterThanOrEqual(24);
	}
});

test('off-centre slides dim only their media, never their text', async ({ page }) => {
	await page.goto('/work/mri-viewer');
	await page.locator('[data-carousel]').scrollIntoViewIfNeeded();
	const cta = page.locator('[data-slide]').last();
	await expect(cta).not.toHaveAttribute('data-active', '');
	const opacities = await cta.evaluate((el) => {
		const chain = (n: Element | null): number[] => (n ? [Number(getComputedStyle(n).opacity), ...chain(n.parentElement)] : []);
		return chain(el.querySelector('.frame-cta span')!);
	});
	expect(Math.min(...opacities)).toBe(1);
});

test('the first slide is fetched with high priority', async ({ page }) => {
	await page.goto('/work/myne');
	await expect(page.locator('[data-slide]').first().locator('img')).toHaveAttribute('fetchpriority', 'high');
	await page.goto('/work/chauffeur');
	await expect(page.locator('link[rel="preload"][as="image"][href="/media/chauffeur/honest.webp"]')).toHaveCount(1);
});

test('image slides offer a half-width candidate so phones download less', async ({ page }) => {
	await page.goto('/work/hard-pills');
	const img = page.locator('[data-slide]').first().locator('img');
	await expect(img).toHaveAttribute('srcset', '/media/hard-pills/home-sm.webp 720w, /media/hard-pills/home.webp 1440w');
	await expect(img).toHaveAttribute('sizes', /86vw/);
});

test('two quick Next presses move exactly two slides', async ({ page }) => {
	await page.goto('/work/myne');
	const c = page.locator('[data-carousel]');
	await c.locator('[data-next]').click();
	await c.locator('[data-next]').click();
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 03 / 05');
});

test('the slide counter is announced politely', async ({ page }) => {
	await page.goto('/work/myne');
	await expect(page.locator('[data-counter]')).toHaveAttribute('aria-live', 'polite');
	await expect(page.locator('[data-counter]')).toHaveAttribute('aria-atomic', 'true');
});

test('a video waits until its slide is at least 60% visible', async ({ page }) => {
	await page.goto('/work/chauffeur');
	const video = page.locator('[data-slide]').first().locator('video');
	await page.evaluate(() => {
		const r = document.querySelector('[data-slide]')!.getBoundingClientRect();
		window.scrollBy({ top: r.top - innerHeight + r.height * 0.4, behavior: 'instant' }); // smooth scroll-behavior would leave it at 0
	});
	await page.waitForTimeout(600);
	expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
	await page.locator('[data-slide]').first().scrollIntoViewIfNeeded();
	await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 5000 }).toBe(true);
});

test('an arrow press that cannot move leaves no stale target behind', async ({ page }) => {
	await page.goto('/work/mri-viewer');
	const c = page.locator('[data-carousel]');
	await c.locator('[data-prev]').click(); // already on the first slide
	await c.locator('[data-slide]').last().getByRole('link').focus(); // focus scrolls the track to the last slide
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 04 / 04');
	await c.locator('[data-prev]').click();
	await expect(c.locator('[data-counter]')).toHaveText('FIG. 03 / 04');
});
