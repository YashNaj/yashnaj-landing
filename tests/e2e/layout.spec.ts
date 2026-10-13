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
