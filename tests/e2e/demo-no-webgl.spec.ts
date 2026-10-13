import { expect, test } from '@playwright/test';

// launchOptions forces a separate worker, so this lives in its own file.
test.use({ launchOptions: { args: ['--disable-gpu', '--disable-webgl', '--disable-3d-apis'] } });

test('without WebGL the viewer still renders (CPU fallback) instead of spinning', async ({ page }) => {
	await page.goto('/demo/mri');
	expect(await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'))).toBe(false);
	await expect(page.locator('#sliceLabel')).toHaveText('1 / 22', { timeout: 20000 });
	await expect(page.locator('#overlay')).toBeHidden();
});
