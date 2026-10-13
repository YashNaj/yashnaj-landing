import type { Page } from '@playwright/test';

/** Pretend the browser lacks scroll-driven animations, so the timed draw-in runs (the Firefox path). */
export const timedMode = (page: Page) =>
	page.addInitScript(() => {
		const supports = CSS.supports.bind(CSS) as (...a: string[]) => boolean;
		CSS.supports = ((...a: string[]) => (/animation-timeline/.test(a.join(':')) ? false : supports(...a))) as typeof CSS.supports;
	});
