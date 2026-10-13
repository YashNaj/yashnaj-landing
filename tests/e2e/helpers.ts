import type { Page } from '@playwright/test';

/** Pretend the browser lacks scroll-driven animations, so the timed draw-in runs (the Firefox path). */
export const timedMode = (page: Page) =>
	page.addInitScript(() => {
		const supports = CSS.supports.bind(CSS) as (...a: string[]) => boolean;
		CSS.supports = ((...a: string[]) => (/animation-timeline/.test(a.join(':')) ? false : supports(...a))) as typeof CSS.supports;
	});

/** Scroll so the sheet `slug` sits at scrub progress p (0–100) for the current viewport. Mirrors app.css's range map. */
export const scrubTo = (page: Page, slug: string, p: number) =>
	page.evaluate(
		([slug, p]) => {
			const pin = document.getElementById(slug)!.closest('.pin')!;
			const vh = innerHeight;
			const T = pin.getBoundingClientRect().top + scrollY;
			const r0 = matchMedia('(min-width: 1024px) and (min-height: 760px)').matches ? 0.9 : 0.2;
			scrollTo({ top: T - vh + (r0 + (p / 100) * 0.5) * vh, behavior: 'instant' });
		},
		[slug, p] as [string, number]
	);

/** The sheet's scrub progress as the drawing sees it. */
export const sp = (page: Page, slug: string) =>
	page.locator(`#${slug} figure.drawing`).evaluate((f) => parseFloat(getComputedStyle(f).getPropertyValue('--sp')));

/** Vertical spread (px) between the drawing's layer SVGs: 0 when assembled flat. */
export const layerSpread = (page: Page, slug: string) =>
	page.locator(`#${slug} figure.drawing`).evaluate((f) => {
		const tops = [...f.querySelectorAll('.stack > svg.layer')].map((l) => l.getBoundingClientRect().top);
		return Math.max(...tops) - Math.min(...tops);
	});
