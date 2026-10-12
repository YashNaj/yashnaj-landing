import { expect, test } from '@playwright/test';

test('home renders the name as the only h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toHaveCount(1);
	await expect(page.locator('h1')).toContainText('Yashal Najeeb');
	await expect(page.locator('html')).toHaveClass(/\bjs\b/);
});
