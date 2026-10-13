import { expect, test } from '@playwright/test';

test('raw demo loads the first series and renders slice 1 of 22', async ({ page }) => {
	await page.goto('/demo/mri');
	await expect(page).toHaveTitle('MRI/CT Viewer — Demo');
	await expect(page.locator('#sliceLabel')).toHaveText('1 / 22', { timeout: 20000 });
	await expect(page.locator('#overlay')).toBeHidden();
	await expect(page.locator('#strip .chip')).toHaveCount(7);
});

test('switching to the 100-slice series updates the label', async ({ page }) => {
	await page.goto('/demo/mri');
	await expect(page.locator('#sliceLabel')).toHaveText('1 / 22', { timeout: 20000 });
	await page.locator('#strip .chip').nth(6).click();
	await expect(page.locator('#sliceLabel')).toHaveText('1 / 100', { timeout: 20000 });
});

test('raw demo files are not indexed', async ({ request }) => {
	expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /demo/');
});
