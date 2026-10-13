import { expect, test } from '@playwright/test';

for (const url of ['/', '/work/chauffeur', '/work/myne', '/work/mri-viewer', '/work/hard-pills']) {
	test(`reduced motion: nothing runs on ${url}`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto(url);
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
		await page.waitForTimeout(800);
		const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
		expect(running).toBe(0);
	});
}
