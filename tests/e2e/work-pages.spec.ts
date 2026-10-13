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
			[...document.querySelectorAll('*')].map((n) => getComputedStyle(n).viewTransitionName).filter((n) => n && n !== 'none' && n !== 'root' && !n.startsWith('case-')).sort()
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

for (const slug of slugs) {
	test(`/work/${slug} shares its own card`, async ({ page, request }) => {
		await page.goto(`/work/${slug}`);
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `https://yashnaj.dev/og/${slug}.png`);
		await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', / — a project by Yashal Najeeb/);
		const res = await request.get(`/og/${slug}.png`);
		expect(res.status()).toBe(200);
		expect(res.headers()['content-type']).toBe('image/png');
	});
}

test('Hard Pills meta description does not repeat itself', async ({ page }) => {
	await page.goto('/work/hard-pills');
	const d = (await page.locator('meta[name="description"]').getAttribute('content'))!;
	expect(d).toContain('custom admin');
	expect(d).not.toContain('runs entirely herself. Live in production');
});

test('morph groups carry view-transition classes on both pages', async ({ page }) => {
	for (const url of ['/', '/work/myne']) {
		await page.goto(url);
		const scope = url === '/' ? page.locator('#myne') : page.locator('main');
		const classes = await scope.evaluate((el) =>
			[el, ...el.querySelectorAll('*')].map((n) => getComputedStyle(n).viewTransitionClass).filter((c) => c && c !== 'none').sort()
		);
		expect(classes).toEqual(expect.arrayContaining(['vt-drawing', 'vt-sheet', 'vt-title']));
	}
});

test('after Back from a project, the home page is fully drawn and visible', async ({ page }) => {
	await page.goto('/');
	await page.locator('#myne').getByRole('link', { name: /View project/ }).click();
	await expect(page).toHaveURL('/work/myne');
	await page.goBack();
	await page.locator('#myne').scrollIntoViewIfNeeded();
	await expect(page.locator('#myne figure.drawing')).toHaveAttribute('data-drawn', '', { timeout: 8000 });
	expect(await page.locator('#myne [data-reveal], #myne').evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity))).not.toContain('0');
});

test('Back lands on finished drawings, not a replay', async ({ page }) => {
	await page.goto('/');
	await page.locator('#myne').getByRole('link', { name: /View project/ }).click();
	await expect(page).toHaveURL('/work/myne');
	await page.goBack();
	const fig = page.locator('#myne figure.drawing');
	await expect(fig).toHaveAttribute('data-drawn', '', { timeout: 1000 });
	const stroke = fig.locator('.stroke').first();
	expect(await stroke.evaluate((el) => getComputedStyle(el).transitionDuration.split(',').every((d) => parseFloat(d) === 0))).toBe(true);
	expect(await stroke.evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset))).toBe(0);
});

test('write-up sections reveal on scroll; header and carousel are visible at first paint', async ({ page }) => {
	await page.goto('/work/chauffeur');
	expect(await page.locator('main > header').evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
	expect(await page.locator('[data-carousel]').evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
	const sec = page.locator('section[data-reveal]').first();
	await sec.scrollIntoViewIfNeeded();
	await expect.poll(() => sec.evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
});

test('"All work" from a project lands on finished drawings, like Back', async ({ page }) => {
	await page.goto('/work/chauffeur');
	await page.getByRole('link', { name: /All work/ }).click();
	await expect(page).toHaveURL('/#work');
	await expect(page.locator('html')).toHaveClass(/\brestored\b/);
	const fig = page.locator('#chauffeur figure.drawing');
	// 1 s raced page load under parallel workers; the no-replay proof is the zero transition below
	await expect(fig).toHaveAttribute('data-drawn', '', { timeout: 3000 });
	const stroke = fig.locator('.stroke').first();
	expect(await stroke.evaluate((el) => getComputedStyle(el).transitionDuration.split(',').every((d) => parseFloat(d) === 0))).toBe(true);
});

test('returning home does not replay the hero entrance', async ({ page }) => {
	await page.goto('/');
	await page.locator('#myne').getByRole('link', { name: /View project/ }).click();
	await expect(page).toHaveURL('/work/myne');
	await page.goBack();
	await expect(page.locator('html')).toHaveClass(/\brestored\b/); // a reload-style traversal, not a bfcache restore
	await page.evaluate(() => window.scrollTo(0, 0));
	expect(await page.locator('[data-enter]').evaluateAll((els) => els.flatMap((e) => e.getAnimations()).filter((a) => a.playState === 'running').length)).toBe(0);
});
