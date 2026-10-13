import { expect, test } from '@playwright/test';
import { layerSpread, scrubTo, sp, timedMode } from './helpers';

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
	test('narrow desktop window (768×800): no pin, so the sheet is never cropped', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 800 });
		await page.goto('/');
		for (const slug of ['chauffeur', 'myne', 'mri-viewer', 'hard-pills']) {
			expect(await pinExtra(page, slug), slug).toBeLessThan(1);
			expect(await page.locator(`#${slug}`).evaluate((a) => getComputedStyle(a).position), slug).not.toBe('sticky');
		}
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

test.describe('assembly (desktop)', () => {
	test.use({ viewport: { width: 1280, height: 900 } });
	const dash = (page: import('@playwright/test').Page) =>
		page.locator('#myne figure.drawing .stroke').evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).strokeDashoffset.replace('calc(', ''))));

	test('scroll assembles the drawing, and scrolling back takes it apart', async ({ page }) => {
		await page.goto('/');
		await scrubTo(page, 'myne', 0);
		await expect.poll(() => sp(page, 'myne')).toBeLessThan(1);
		expect(await layerSpread(page, 'myne')).toBeGreaterThan(20);
		expect(Math.min(...(await dash(page)))).toBeGreaterThan(0.9);
		await scrubTo(page, 'myne', 40);
		await expect.poll(() => sp(page, 'myne')).toBeCloseTo(40, -1);
		const mid = await dash(page);
		expect(mid.some((d) => d === 0)).toBe(true); // early strokes done
		expect(mid.some((d) => d > 0.5)).toBe(true); // late strokes still to come
		expect(await layerSpread(page, 'myne')).toBeGreaterThan(20); // still exploded before 55%
		await scrubTo(page, 'myne', 100);
		await expect.poll(() => sp(page, 'myne')).toBeGreaterThan(99);
		await expect.poll(() => layerSpread(page, 'myne')).toBeLessThan(1);
		expect(Math.max(...(await dash(page)))).toBe(0);
		await scrubTo(page, 'myne', 0);
		await expect.poll(() => layerSpread(page, 'myne')).toBeGreaterThan(20);
		expect(Math.min(...(await dash(page)))).toBeGreaterThan(0.9);
	});

	test('each part gets a scroll slot in document order inside the 0–65 window; counts land at 85–100', async ({ page }) => {
		await page.goto('/');
		const slots = await page.locator('#chauffeur figure.drawing').evaluate((f) =>
			[...f.querySelectorAll('.stroke, .after, .type, .stamp, .cursor, .unlock, .slide-out, .grow, [data-count]')].map((el) => ({
				a0: parseFloat((el as HTMLElement).style.getPropertyValue('--a0')),
				a1: parseFloat((el as HTMLElement).style.getPropertyValue('--a1')),
				count: el.hasAttribute('data-count')
			}))
		);
		const parts = slots.filter((s) => !s.count);
		for (let i = 0; i < parts.length; i++) {
			expect(parts[i].a0).toBeGreaterThanOrEqual(0);
			expect(parts[i].a1).toBeLessThanOrEqual(65);
			expect(parts[i].a1).toBeGreaterThan(parts[i].a0);
			if (i) expect(parts[i].a0).toBeGreaterThanOrEqual(parts[i - 1].a0);
		}
		for (const c of slots.filter((s) => s.count)) expect([c.a0, c.a1]).toEqual([85, 100]);
	});

	test('typed labels type with scroll; counts, callouts and live parts land last at their final value', async ({ page }) => {
		await page.goto('/');
		await page.evaluate(() => {
			(window as any).__seen = [];
			const t = document.querySelector('#chauffeur text[data-count="260"]')!;
			new MutationObserver(() => (window as any).__seen.push(t.textContent)).observe(t, { childList: true, characterData: true, subtree: true });
		});
		const label = page.locator('#chauffeur text.type').first();
		const count = page.locator('#chauffeur text[data-count="260"]');
		const live = page.locator('#chauffeur .live').first();
		const op = (l: import('@playwright/test').Locator) => l.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
		// live loops own their opacity; the band shows through filter: opacity()
		const band = (l: import('@playwright/test').Locator) =>
			l.evaluate((el) => parseFloat(/opacity\((?:calc\()?([\d.]+)/.exec(getComputedStyle(el).filter)?.[1] ?? 'NaN'));
		await scrubTo(page, 'chauffeur', 0);
		await expect.poll(() => sp(page, 'chauffeur')).toBeLessThan(1);
		expect(await label.locator('tspan').evaluateAll((ts) => ts.map((t) => getComputedStyle(t).opacity))).not.toContain('1');
		await scrubTo(page, 'chauffeur', 80);
		await expect.poll(() => sp(page, 'chauffeur')).toBeCloseTo(80, -1);
		expect(await op(count)).toBe(0);
		expect(await band(live)).toBe(0);
		await scrubTo(page, 'chauffeur', 100);
		await expect.poll(() => sp(page, 'chauffeur')).toBeGreaterThan(99);
		expect(new Set(await label.locator('tspan').evaluateAll((ts) => ts.map((t) => getComputedStyle(t).opacity)))).toEqual(new Set(['1']));
		expect(await op(count)).toBe(1);
		expect(await band(live)).toBe(1);
		await expect(count).toHaveText('H 260');
		expect(await page.evaluate(() => (window as any).__seen.length)).toBe(0); // never counted
		await expect(page.locator('#chauffeur figure.drawing')).toHaveAttribute('data-live', '');
	});

	test('the construction layer is visible from the start', async ({ page }) => {
		await page.goto('/');
		await scrubTo(page, 'myne', 0);
		await expect.poll(() => sp(page, 'myne')).toBeLessThan(1);
		expect(await page.locator('#myne figure.drawing .c').first().evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
	});
});

test.describe('everyone else gets finished, flat drawings and no pin', () => {
	test.use({ viewport: { width: 1280, height: 900 } });
	const flatAndFinished = async (page: import('@playwright/test').Page, slug = 'myne') => {
		await page.locator(`#${slug}`).scrollIntoViewIfNeeded();
		await expect.poll(() => layerSpread(page, slug)).toBeLessThan(1);
		await expect
			.poll(() => page.locator(`#${slug} figure.drawing .stroke`).evaluateAll((els) => Math.max(...els.map((el) => parseFloat(getComputedStyle(el).strokeDashoffset.replace('calc(', ''))))), { timeout: 10000 })
			.toBe(0);
		expect(await pinExtra(page, slug)).toBeLessThan(1);
	};

	test('reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await flatAndFinished(page);
	});
	test('reduced motion switched on after load', async ({ page }) => {
		await page.goto('/');
		await scrubTo(page, 'myne', 0);
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await flatAndFinished(page);
	});
	test('no scroll-driven animations (timed draw-in instead)', async ({ page }) => {
		await timedMode(page);
		await page.goto('/');
		await flatAndFinished(page);
		await expect(page.locator('#myne figure.drawing')).toHaveAttribute('data-drawn', '');
	});
	test('print', async ({ page }) => {
		await page.goto('/');
		await page.emulateMedia({ media: 'print' });
		await flatAndFinished(page);
	});
	test('the project page drawing', async ({ page }) => {
		await page.goto('/work/myne');
		const fig = page.locator('header figure.drawing');
		const tops = await fig.evaluate((f) => [...f.querySelectorAll('.stack > svg.layer')].map((l) => l.getBoundingClientRect().top));
		expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);
	});
	test('clicking through mid-assembly, then Back', async ({ page }) => {
		await page.goto('/');
		await scrubTo(page, 'myne', 60);
		await page.locator('#myne').getByRole('link', { name: /View project/ }).click();
		await expect(page).toHaveURL('/work/myne');
		const fig = page.locator('header figure.drawing');
		const tops = await fig.evaluate((f) => [...f.querySelectorAll('.stack > svg.layer')].map((l) => l.getBoundingClientRect().top));
		expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);
		await page.goBack();
		await expect(page.locator('html')).toHaveClass(/\brestored\b/);
		await flatAndFinished(page);
	});
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
	test('drawings are finished and flat, and nothing pins', async ({ page }) => {
		await page.goto('/');
		await page.locator('#myne').scrollIntoViewIfNeeded();
		expect(await layerSpread(page, 'myne')).toBeLessThan(1);
		expect(await pinExtra(page)).toBeLessThan(1);
		expect(await page.locator('#myne figure.drawing .stroke').first().evaluate((el) => getComputedStyle(el).strokeDashoffset)).toMatch(/^0(px)?$/);
	});
});

test('a deep link to a sheet lands before its pin, and scrolling on completes it', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/#myne');
	// the fragment scroll lands late (smooth scroll after load): wait until the sheet has arrived at the top
	await expect.poll(() => page.locator('#myne').evaluate((a) => a.getBoundingClientRect().top), { timeout: 5000 }).toBeLessThan(200);
	await page.waitForTimeout(300);
	expect(await sp(page, 'myne')).toBeLessThan(1);
	await scrubTo(page, 'myne', 100);
	await expect.poll(() => layerSpread(page, 'myne')).toBeLessThan(1);
});
