import { expect, test } from '@playwright/test';

const slugs = ['chauffeur', 'myne', 'mri-viewer', 'hard-pills'];

for (const slug of slugs) {
	test(`/work/${slug} renders with its own head`, async ({ page }) => {
		await page.goto(`/work/${slug}`);
		await expect(page.locator('h1')).toHaveCount(1);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://yashnaj.dev/work/${slug}`);
		await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `https://yashnaj.dev/work/${slug}`);
		await expect(page).toHaveTitle(/ — Yashal Najeeb$/);
		for (const h of ['The problem', 'What I built', 'How it works', 'Outcome']) {
			await expect(page.getByRole('heading', { level: 2, name: h })).toBeVisible();
		}
		await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
		await expect(page.getByRole('link', { name: /All work/ })).toHaveAttribute('href', '/#work');
	});
}

test('prev/next links cycle through the projects', async ({ page }) => {
	await page.goto('/work/chauffeur');
	await expect(page.getByRole('link', { name: /Next: Myne Global/ })).toHaveAttribute('href', '/work/myne');
	await expect(page.getByRole('link', { name: /Previous: Hard Pills to Swallow/ })).toHaveAttribute('href', '/work/hard-pills');
});

test('unknown project slug is a noindex 404', async ({ page }) => {
	const res = await page.goto('/work/nope');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

test('home keeps its JSON-LD and canonical', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://yashnaj.dev/');
	await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
});

test('sitemap lists every project page and the demo', async ({ request }) => {
	const xml = await (await request.get('/sitemap.xml')).text();
	for (const slug of slugs) expect(xml).toContain(`<loc>https://yashnaj.dev/work/${slug}</loc>`);
	expect(xml).toContain('<loc>https://yashnaj.dev/work/mri-viewer/demo</loc>');
});

test('each home sheet links to its page and shares view-transition names with it', async ({ page }) => {
	for (const slug of slugs) {
		await page.goto('/');
		const sheet = page.locator(`#${slug}`);
		const names = await sheet.evaluate((el) =>
			[el, ...el.querySelectorAll('*')].map((n) => getComputedStyle(n).viewTransitionName).filter((n) => n && n !== 'none' && n !== 'root').sort()
		);
		expect(names).toEqual([`drawing-${slug}`, `sheet-${slug}`, `sheetno-${slug}`, `title-${slug}`]);
		await sheet.getByRole('link', { name: /View project/ }).click();
		await expect(page).toHaveURL(`/work/${slug}`);
		const target = await page.evaluate(() =>
			[...document.querySelectorAll('*')].map((n) => getComputedStyle(n).viewTransitionName).filter((n) => n && n !== 'none' && n !== 'root').sort()
		);
		expect(target).toEqual(names);
	}
});

test('cross-document view transitions are enabled and disabled for reduced motion', async ({ page }) => {
	await page.goto('/');
	const css = await page.evaluate(() => [...document.styleSheets].flatMap((s) => [...s.cssRules].map((r) => r.cssText)).join('\n'));
	expect(css).toMatch(/@view-transition\s*\{\s*navigation:\s*auto/);
	expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*::view-transition-group\(\*\)[\s\S]*animation: (none|auto ease 0s 1 normal none running none)/);
});
