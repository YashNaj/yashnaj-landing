import { expect, test } from '@playwright/test';

// Finished drawings must look the same after the layer restructure (separate stacked SVGs).
test.use({ viewport: { width: 1280, height: 900 } });
for (const slug of ['chauffeur', 'myne', 'mri-viewer', 'hard-pills']) {
	test(`${slug} finished drawing is unchanged`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		const fig = page.locator(`#${slug} figure.drawing`);
		await fig.scrollIntoViewIfNeeded();
		await expect(fig).toHaveScreenshot(`${slug}.png`, { maxDiffPixelRatio: 0.01, animations: 'disabled' });
	});
}
