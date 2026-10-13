import { expect, test } from '@playwright/test';

const models = ['chauffeur', 'mri-viewer'] as const; // Task 6 appends 'myne'
const faceMatrix = (page: import('@playwright/test').Page, sel: string) =>
	page.locator(sel).first().getAttribute('transform');

test.describe('3D drawings render their final pose without JavaScript', () => {
	test.use({ javaScriptEnabled: false });
	for (const slug of models) {
		test(`${slug}: wire, mapped planes and an occluding face`, async ({ page }) => {
			await page.goto('/');
			const svg = page.locator(`#${slug} svg[data-model]`);
			expect(await svg.locator('.wire path[data-pts]').count()).toBeGreaterThanOrEqual(20);
			expect(await svg.locator('[data-plane]').count()).toBeGreaterThanOrEqual(2);
			expect(await faceMatrix(page, `#${slug} [data-plane]`)).not.toMatch(/^matrix\(1 0 0 1 0 0\)$/);
			expect(await svg.locator('.face-fill').count()).toBeGreaterThanOrEqual(1);
		});
		test(`${slug}: the project page shows the identical final pose (morph matches)`, async ({ page }) => {
			await page.goto('/');
			const home = await page.locator(`#${slug} svg[data-model]`).evaluate((s) => [...s.querySelectorAll('[data-pts]')].map((p) => p.getAttribute('d')).join('|') + [...s.querySelectorAll('[data-plane]')].map((g) => g.getAttribute('transform')).join('|'));
			await page.goto(`/work/${slug}`);
			const work = await page.locator('header svg[data-model]').evaluate((s) => [...s.querySelectorAll('[data-pts]')].map((p) => p.getAttribute('d')).join('|') + [...s.querySelectorAll('[data-plane]')].map((g) => g.getAttribute('transform')).join('|'));
			expect(work).toBe(home);
		});
	}
	test('construction axes turn with the phone (mid plane)', async ({ page }) => {
		await page.goto('/');
		const axes = page.locator('#chauffeur [data-plane] .c').first();
		expect(await axes.evaluate((el) => el.closest('[data-plane]')!.getAttribute('data-plane'))).toBe('0,0,0,1,0,0,0,1,0');
	});
	test('leader starts at the projected button', async ({ page }) => {
		await page.goto('/');
		const pts = await page.locator('#chauffeur polyline[data-anchor]').getAttribute('points');
		expect(pts!.split(' ')[0]).not.toBe('214,177');
	});
});

const nums = (m: string | null) => m!.match(/-?[\d.]+/g)!.map(Number);
test.describe('the turn', () => {
	test.use({ viewport: { width: 1280, height: 900 } });
	test('a 3D drawing turns into its final pose as it draws, then holds the SSR pose', async ({ page }) => {
		await page.goto('/');
		const face = page.locator('#chauffeur [data-plane].face');
		const ssr = await page.evaluate(async () => (await (await fetch('/')).text()).match(/class="face"[^>]*transform="([^"]+)"|transform="([^"]+)"[^>]*class="face"/)!.slice(1).find(Boolean));
		const before = await face.getAttribute('transform');
		expect(nums(before)[0]).not.toBeCloseTo(nums(ssr!)[0], 2); // sits at FROM until it draws
		await page.locator('#chauffeur').scrollIntoViewIfNeeded();
		await expect.poll(async () => nums(await face.getAttribute('transform')).map((n, i) => Math.abs(n - nums(ssr!)[i])).every((d) => d < 0.01), { timeout: 4000 }).toBe(true);
	});
	test('reduced motion never turns', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		const face = page.locator('#chauffeur [data-plane].face');
		const t0 = await face.getAttribute('transform');
		await page.locator('#chauffeur').scrollIntoViewIfNeeded();
		await page.waitForTimeout(1500);
		expect(await face.getAttribute('transform')).toBe(t0);
	});
	test('if models.js never loads, the drawing still draws and keeps the SSR pose', async ({ page }) => {
		// deferred scripts run in order, so enhance.js can't start a draw before models.js; the real failure is models.js missing
		await page.route('**/models*.js', (r) => r.abort());
		await page.goto('/');
		const face = page.locator('#chauffeur [data-plane].face');
		const ssr = await face.getAttribute('transform');
		await page.locator('#chauffeur').scrollIntoViewIfNeeded();
		await expect(page.locator('#chauffeur figure.drawing')).toHaveAttribute('data-drawn', '');
		await page.waitForTimeout(2000);
		expect(await face.getAttribute('transform')).toBe(ssr);
		await expect(page.locator('html')).toHaveClass(/\bdraw-ready\b/);
	});
	test('story figures draw fast (finished by 2 s)', async ({ page }) => {
		await page.goto('/');
		await page.locator('#chauffeur').scrollIntoViewIfNeeded();
		await expect(page.locator('#chauffeur figure.drawing')).toHaveAttribute('data-drawn', '');
		const end = await page.locator('#chauffeur .stroke').evaluateAll((els) => Math.max(...els.map((e) => parseFloat((e as HTMLElement).style.getPropertyValue('--t')) + parseFloat((e as HTMLElement).style.getPropertyValue('--d') || '0'))));
		expect(end).toBeLessThanOrEqual(2000);
	});
	test('project pages do not load models.js', async ({ page }) => {
		const urls: string[] = [];
		page.on('request', (r) => urls.push(r.url()));
		await page.goto('/work/chauffeur');
		expect(urls.some((u) => /models[.-][\w-]+\.js/.test(u))).toBe(false);
	});
});

test.describe('stories', () => {
	test.use({ viewport: { width: 1280, height: 900 } });
	const loopParts: Record<string, string> = {
		chauffeur: '.cursor, .btn, .ripple, .st-a, .st-b, .st-tick, .leader-pulse, .stamp, .st-one, .st-zero',
		'mri-viewer': '.st-plane-g, .vp, .st-slice, .knob, .st-bridge'
	};
	for (const [slug, sel] of Object.entries(loopParts)) {
		test(`${slug}: every loop part runs on the drawing's one clock, only while live`, async ({ page }) => {
			await page.goto('/');
			const fig = page.locator(`#${slug} figure.drawing`);
			await fig.scrollIntoViewIfNeeded();
			await expect(fig).toHaveAttribute('data-live', '', { timeout: 6000 });
			const durs = await fig.locator(sel).evaluateAll((els) => els.map((e) => getComputedStyle(e).animationDuration));
			const loop = await fig.locator('svg.story').evaluate((s) => getComputedStyle(s).getPropertyValue('--loop').trim());
			expect(new Set(durs)).toEqual(new Set([loop]));
			await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
			await expect(fig).not.toHaveAttribute('data-live', '');
			expect(await fig.locator(sel).evaluateAll((els) => els.every((e) => getComputedStyle(e).animationName === 'none'))).toBe(true);
		});
	}
	test('chauffeur beats: "1 CHANGE" shows mid-loop, then the counter is back to 0', async ({ page }) => {
		await page.goto('/');
		const fig = page.locator('#chauffeur figure.drawing');
		await fig.scrollIntoViewIfNeeded();
		await expect(fig).toHaveAttribute('data-live', '', { timeout: 6000 });
		const at = (f: number) => fig.locator('.st-one').evaluate((el, f) => { const a = el.getAnimations()[0]; a.pause(); a.currentTime = (a.effect!.getTiming().duration as number) * f; return getComputedStyle(el).opacity; }, f);
		expect(await at(0.52)).toBe('1');
		expect(await at(0.7)).toBe('0');
	});
});

/** Pause every animation in a drawing at fraction f of its loop. */
const seek = (page: import('@playwright/test').Page, slug: string, f: number) =>
	page.locator(`#${slug} figure.drawing`).evaluate((fig, f) => {
		for (const a of fig.getAnimations({ subtree: true })) {
			a.pause();
			a.currentTime = ((a.effect!.getTiming().duration as number) || 0) * f;
		}
	}, f);
const live = async (page: import('@playwright/test').Page, slug: string) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/');
	const fig = page.locator(`#${slug} figure.drawing`);
	await fig.scrollIntoViewIfNeeded();
	await expect(fig).toHaveAttribute('data-live', '', { timeout: 6000 });
	return fig;
};

test('mri beats: the slice plane steps down the stack and the readout follows', async ({ page }) => {
	const fig = await live(page, 'mri-viewer');
	const y = () => fig.locator('.st-plane-g').evaluate((g) => (g as SVGGraphicsElement).getBoundingClientRect().top);
	const shown = () => fig.locator('.st-slice').evaluateAll((ts) => ts.filter((t) => getComputedStyle(t).opacity === '1').map((t) => t.textContent));
	await seek(page, 'mri-viewer', 0.08);
	const y0 = await y();
	expect(await shown()).toEqual(['SLICE 115/232']);
	await seek(page, 'mri-viewer', 0.4);
	expect(await y()).toBeGreaterThan(y0 + 40);
	expect(await shown()).toEqual(['SLICE 117/232']);
});
