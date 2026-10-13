import { expect, test } from '@playwright/test';

test('stroke timing follows real path length and plays in document order', async ({ page }) => {
	await page.goto('/');
	const fig = page.locator('#myne figure.drawing');
	await fig.scrollIntoViewIfNeeded();
	await expect(fig).toHaveAttribute('data-drawn', '');
	const timing = await fig.evaluate((f) =>
		[...f.querySelectorAll('.stroke')].map((el) => ({
			len: (el as SVGGeometryElement).getTotalLength(),
			d: parseFloat((el as HTMLElement).style.getPropertyValue('--d')),
			t: parseFloat((el as HTMLElement).style.getPropertyValue('--t'))
		}))
	);
	const byLen = [...timing].sort((a, b) => a.len - b.len);
	expect(byLen.at(-1)!.d).toBeGreaterThan(byLen[0].d);
	for (let i = 1; i < timing.length; i++) expect(timing[i].t).toBeGreaterThanOrEqual(timing[i - 1].t);
});

test('loops run only while a finished drawing is on screen, and a revisit is not restarted', async ({ page }) => {
	await page.goto('/');
	const fig = page.locator('#chauffeur figure.drawing');
	await fig.scrollIntoViewIfNeeded();
	await expect(fig).toHaveAttribute('data-live', '', { timeout: 15000 });
	await page.locator('#hard-pills').scrollIntoViewIfNeeded();
	await expect(fig).not.toHaveAttribute('data-live', '');
	expect(await fig.locator('.live').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
	await fig.scrollIntoViewIfNeeded();
	await expect(fig).toHaveAttribute('data-live', '');
	expect(await fig.locator('.stroke').first().evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset))).toBe(0);
});

test('a drawing scrolled past before it finishes never goes live off-screen', async ({ page }) => {
	await page.goto('/');
	const fig = page.locator('#myne figure.drawing');
	await fig.scrollIntoViewIfNeeded();
	await page.waitForTimeout(150);
	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	await page.waitForTimeout(6000);
	await expect(fig).not.toHaveAttribute('data-live', '');
});

test('fine pointer shifts depth layers; touch gets none', async ({ page, browser }) => {
	await page.goto('/');
	const fig = page.locator('#myne figure.drawing');
	await fig.scrollIntoViewIfNeeded();
	const box = (await fig.boundingBox())!;
	await page.mouse.move(box.x + box.width * 0.95, box.y + box.height * 0.95);
	const top = fig.locator('svg > g.layer').last();
	await expect.poll(() => top.evaluate((g) => getComputedStyle(g).transform)).not.toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
	const touch = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
	const p2 = await touch.newPage();
	await p2.goto('/');
	const f2 = p2.locator('#myne figure.drawing');
	await f2.scrollIntoViewIfNeeded();
	expect(await f2.evaluate((f) => (f as HTMLElement).style.getPropertyValue('--px'))).toBe('');
	await touch.close();
});

test('project page drawing is complete at first paint', async ({ page }) => {
	await page.goto('/work/myne');
	await expect(page.locator('header figure.drawing')).toHaveAttribute('data-drawn', '');
	expect(await page.locator('header figure.drawing .stroke').first().evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset))).toBe(0);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });
	test('construction, stamps and grown masks are all visible', async ({ page }) => {
		await page.goto('/');
		for (const sel of ['.c', '.after']) {
			expect(await page.locator(`#chauffeur ${sel}`).first().evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
		}
	});
});
