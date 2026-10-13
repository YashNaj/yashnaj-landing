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
