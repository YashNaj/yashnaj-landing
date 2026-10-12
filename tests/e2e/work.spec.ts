import { expect, test, type Page } from '@playwright/test';

const dashOffset = (page: Page, slug: string) =>
	page
		.locator(`#${slug} figure.drawing .stroke`)
		.first()
		.evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset));

test('renders four project sheets in order with labelled drawings', async ({ page }) => {
	await page.goto('/');
	const sheets = page.getByTestId('project-sheet');
	await expect(sheets).toHaveCount(4);
	await expect(sheets.locator('h3')).toHaveText([
		'chauffeur',
		'Myne Global',
		'Mobile MRI/CT viewer',
		'Hard Pills to Swallow'
	]);
	for (const fig of await page.locator('figure.drawing').all()) {
		await expect(fig).toHaveAttribute('role', 'img');
		expect((await fig.getAttribute('aria-label'))!.length).toBeGreaterThan(10);
	}
});

test('a drawing starts undrawn and draws when scrolled into view', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 700 });
	await page.goto('/');
	expect(await dashOffset(page, 'hard-pills')).toBeGreaterThan(0.5);
	await page.locator('#hard-pills').scrollIntoViewIfNeeded();
	await expect(page.locator('#hard-pills figure.drawing')).toHaveAttribute('data-drawn', '');
	await expect.poll(() => dashOffset(page, 'hard-pills'), { timeout: 5000 }).toBe(0);
});

test('reduced motion shows finished drawings immediately', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	expect(await dashOffset(page, 'hard-pills')).toBe(0);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });
	test('drawings are fully visible', async ({ page }) => {
		await page.goto('/');
		expect(await dashOffset(page, 'chauffeur')).toBe(0);
		expect(await dashOffset(page, 'hard-pills')).toBe(0);
	});
});

test('copy button copies the brew command', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/');
	await page.getByTestId('copy-command').click();
	await expect(page.getByTestId('copy-status')).toHaveText('Copied');
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
		'brew install yashnaj/chauffeur/chauffeur'
	);
});

test('copy button falls back to selecting text when clipboard is unavailable', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
	});
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto('/');
	await page.getByTestId('copy-command').click();
	await expect(page.getByTestId('copy-status')).toHaveText('Press ⌘C / Ctrl+C');
	expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
		'brew install yashnaj/chauffeur/chauffeur'
	);
	expect(errors).toEqual([]);
});
