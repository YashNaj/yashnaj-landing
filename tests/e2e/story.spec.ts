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
