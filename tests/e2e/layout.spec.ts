import { expect, test } from '@playwright/test';

test('head has title, description, canonical, OG and JSON-LD without email', async ({ page, request }) => {
	await page.goto('/');
	await expect(page).toHaveTitle('Yashal Najeeb — Full-Stack Product Engineer');
	await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /zero to the App Store/);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://yashnaj.dev/');
	await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://yashnaj.dev/og.png');
	await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
	const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
	expect(ld['@type']).toBe('Person');
	expect(ld.sameAs).toEqual(['https://github.com/YashNaj', 'https://www.linkedin.com/in/yashnaj']);
	expect(JSON.stringify(ld)).not.toContain('@proton.me');
	const og = await request.get('/og.png');
	expect(og.status()).toBe(200);
	expect(og.headers()['content-type']).toBe('image/png');
	expect((await request.get('/favicon.svg')).status()).toBe(200);
});

for (const width of [360, 390, 768, 1440]) {
	test(`no horizontal scroll at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		await page.goto('/');
		// body has overflow-x: hidden, so scrollWidth can't see overflow — check element edges instead
		const offenders = await page.evaluate(() =>
			[...document.querySelectorAll('body *')]
				.filter((el) => !el.closest('[aria-hidden="true"], .sr-only, svg'))
				.filter((el) => {
					const r = el.getBoundingClientRect();
					return r.width > 0 && r.right > window.innerWidth + 0.5;
				})
				.map((el) => el.outerHTML.slice(0, 80))
		);
		expect(offenders).toEqual([]);
	});
}

test('keyboard users reach the contact actions with a visible focus ring', async ({ page }) => {
	await page.goto('/');
	const seen: string[] = [];
	for (let i = 0; i < 6; i++) {
		await page.keyboard.press('Tab');
		const info = await page.evaluate(() => {
			const el = document.activeElement as HTMLElement;
			const cs = getComputedStyle(el);
			return { text: el.textContent?.trim() ?? '', outline: cs.outlineStyle, color: cs.outlineColor };
		});
		seen.push(info.text);
		if (info.text === 'Resume') {
			expect(info.outline).toBe('solid');
			// links have transition-colors, which also animates outline-color — wait for it to settle
			await expect
				.poll(() => page.evaluate(() => getComputedStyle(document.activeElement!).outlineColor))
				.toBe('rgb(255, 122, 61)');
		}
	}
	expect(seen).toEqual(expect.arrayContaining(['Resume', 'GitHub', 'LinkedIn', 'Email']));
});
