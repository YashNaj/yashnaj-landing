import { expect, test, type Page } from '@playwright/test';

// The default headless shell never runs cross-document view transitions; new headless does.
test.use({ channel: 'chromium' });

// Record the types (and every view-transition animation's end time) of the transition that reveals each page.
async function watch(page: Page) {
	await page.addInitScript(() => {
		addEventListener('pagereveal', (e: any) => {
			if (!e.viewTransition) return;
			e.viewTransition.ready.then(() => {
				sessionStorage.setItem('vt-log', JSON.stringify({
					path: location.pathname,
					types: [...e.viewTransition.types],
					anims: document.getAnimations()
						.filter((a) => String((a.effect as KeyframeEffect).pseudoElement).startsWith('::view-transition'))
						.map((a) => ({ el: (a.effect as KeyframeEffect).pseudoElement, name: (a as CSSAnimation).animationName, end: Number(a.effect!.getComputedTiming().endTime) }))
				}));
			}, () => {});
		});
	});
}
const lastLog = async (page: Page, path: string) => {
	await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('vt-log') ?? '{}').path)).toBe(path);
	await page.waitForTimeout(900); // let the transition finish before the next click
	return page.evaluate(() => JSON.parse(sessionStorage.getItem('vt-log')!)) as Promise<{ types: string[]; anims: { el: string; name: string; end: number }[] }>;
};
export { watch, lastLog };

test('each navigation is typed by direction', async ({ page }) => {
	await watch(page);
	await page.goto('/');
	await page.locator('#myne').getByRole('link', { name: /View project/ }).click();
	expect((await lastLog(page, '/work/myne')).types).toEqual(['forward']);
	await page.getByRole('link', { name: /^Next:/ }).click();
	expect((await lastLog(page, '/work/mri-viewer')).types).toEqual(['next']);
	await page.getByRole('link', { name: /Previous:/ }).click();
	expect((await lastLog(page, '/work/myne')).types).toEqual(['prev']);
	await page.goBack();
	expect((await lastLog(page, '/work/mri-viewer')).types).toEqual(['back']);
	await page.getByRole('link', { name: /All work/ }).click();
	expect((await lastLog(page, '/')).types).toEqual(['back']);
});

test('a modifier-click on Next leaves no direction behind', async ({ page }) => {
	await page.goto('/work/myne');
	await page.evaluate(() => {
		addEventListener('click', (e) => e.preventDefault()); // window listener runs after the document one; stop the navigation
		document.querySelector('[data-vt-dir="next"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }));
	});
	expect(await page.evaluate(() => sessionStorage.getItem('vt-dir'))).toBeNull();
});

test('case studies expose the two beats once each, and pages mark themselves', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('main[data-vt-page="home"]')).toHaveCount(1);
	for (const slug of ['chauffeur', 'myne', 'mri-viewer', 'hard-pills']) {
		await page.goto(`/work/${slug}`);
		await expect(page.locator('main[data-vt-page="case"]')).toHaveCount(1);
		const names = await page.evaluate(() => [...document.querySelectorAll('*')].map((n) => getComputedStyle(n).viewTransitionName));
		expect(names.filter((n) => n === 'case-head'), slug).toHaveLength(1);
		expect(names.filter((n) => n === 'case-body'), slug).toHaveLength(1);
		// the footer stays in the root snapshot
		expect(await page.locator('footer').evaluate((f) => !!f.closest('[style*="case-body"]'))).toBe(false);
	}
});

test('every transition finishes within 800 ms and runs the intended moves', async ({ page }) => {
	await watch(page);
	await page.goto('/');
	await page.locator('#myne').getByRole('link', { name: /View project/ }).click();
	const fwd = await lastLog(page, '/work/myne');
	await page.getByRole('link', { name: /^Next:/ }).click();
	const next = await lastLog(page, '/work/mri-viewer');
	await page.getByRole('link', { name: /Previous:/ }).click();
	const prev = await lastLog(page, '/work/myne');
	await page.getByRole('link', { name: /All work/ }).click();
	const back = await lastLog(page, '/');
	for (const log of [fwd, next, prev, back]) {
		expect(log.anims.length).toBeGreaterThan(0);
		for (const a of log.anims) expect(a.end, `${log.types} ${a.el}`).toBeLessThanOrEqual(800);
	}
	// the spec's per-direction ceilings: forward 800, back 600, project → project 500
	const longest = (log: typeof fwd) => Math.max(...log.anims.map((a) => a.end));
	expect(longest(fwd)).toBeLessThanOrEqual(800);
	expect(longest(back)).toBeLessThanOrEqual(600);
	expect(longest(next)).toBeLessThanOrEqual(500);
	expect(longest(prev)).toBeLessThanOrEqual(500);
	const has = (log: typeof fwd, el: string, name: string) => log.anims.some((a) => a.el === el && a.name === name);
	expect(has(fwd, '::view-transition-old(root)', 'vt-fold')).toBe(true);
	expect(has(fwd, '::view-transition-old(sheet-chauffeur)', 'vt-fold')).toBe(true); // the unclicked sheets fold too
	expect(has(fwd, '::view-transition-new(drawing-myne)', 'vt-settle')).toBe(true);
	expect(has(fwd, '::view-transition-image-pair(drawing-myne)', 'vt-lift')).toBe(true);
	expect(has(fwd, '::view-transition-new(case-head)', 'vt-rise')).toBe(true);
	expect(has(fwd, '::view-transition-new(case-body)', 'vt-rise-far')).toBe(true);
	expect(has(next, '::view-transition-old(drawing-myne)', 'vt-slide-out-left')).toBe(true);
	expect(has(next, '::view-transition-new(sheet-mri-viewer)', 'vt-slide-in-right')).toBe(true);
	expect(has(prev, '::view-transition-old(title-mri-viewer)', 'vt-slide-out-right')).toBe(true);
	expect(has(prev, '::view-transition-new(drawing-myne)', 'vt-slide-in-left')).toBe(true);
	expect(has(back, '::view-transition-new(root)', 'vt-unfold')).toBe(true);
	expect(has(back, '::view-transition-old(case-body)', 'vt-fade-out')).toBe(true);
	expect(back.anims.some((a) => a.name === 'vt-settle' || a.name === 'vt-lift')).toBe(false);
});

test('the MRI demo keeps the plain crossfade', async ({ page }) => {
	await watch(page);
	await page.goto('/work/mri-viewer');
	await page.locator('main header a.btn-signal').click();
	const log = await lastLog(page, '/work/mri-viewer/demo');
	expect(log.anims.find((a) => a.el === '::view-transition-old(root)')?.name).toBe('vt-out');
	expect(log.anims.some((a) => a.name === 'vt-fold')).toBe(false);
});

test('reduced motion: a real transition runs no animations', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await watch(page);
	await page.goto('/');
	await page.locator('#myne').getByRole('link', { name: /View project/ }).click();
	expect((await lastLog(page, '/work/myne')).anims).toEqual([]);
});
