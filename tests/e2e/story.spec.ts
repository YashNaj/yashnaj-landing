import { expect, test } from '@playwright/test';

const models = ['chauffeur'] as const; // Tasks 5–6 append 'mri-viewer', 'myne'
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
