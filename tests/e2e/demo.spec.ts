import { expect, test } from '@playwright/test';

test('raw demo loads the first series and renders the middle slice (12 of 22)', async ({ page }) => {
	await page.goto('/demo/mri');
	await expect(page).toHaveTitle('MRI/CT Viewer — Demo');
	await expect(page.locator('#sliceLabel')).toHaveText('12 / 22', { timeout: 20000 });
	await expect(page.locator('#overlay')).toBeHidden();
	await expect(page.locator('#strip .chip')).toHaveCount(7);
});

test('switching to the 100-slice series updates the label', async ({ page }) => {
	await page.goto('/demo/mri');
	await expect(page.locator('#sliceLabel')).toHaveText('12 / 22', { timeout: 20000 });
	await page.locator('#strip .chip').nth(6).click();
	await expect(page.locator('#sliceLabel')).toHaveText('51 / 100', { timeout: 20000 });
});

test('raw demo files are not indexed', async ({ request }) => {
	expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /demo/');
});

test('demo page embeds the viewer, credits the dataset and links back', async ({ page }) => {
	await page.goto('/work/mri-viewer/demo');
	await expect(page.locator('h1')).toHaveText('MRI/CT viewer — live demo');
	await expect(page.getByText('Sample study: BRAINIX')).toBeVisible();
	await expect(page.getByRole('link', { name: /Back to the project/ })).toHaveAttribute('href', '/work/mri-viewer');
	const frame = page.frameLocator('iframe[title="MRI/CT viewer demo"]');
	await expect(frame.locator('#sliceLabel')).toHaveText('12 / 22', { timeout: 20000 });
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://yashnaj.dev/work/mri-viewer/demo');
});

test('demo page is full-bleed on phones', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/work/mri-viewer/demo');
	const box = await page.locator('iframe[title="MRI/CT viewer demo"]').boundingBox();
	expect(box!.width).toBeGreaterThanOrEqual(380);
});
