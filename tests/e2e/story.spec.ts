import { expect, test } from '@playwright/test';

const models = ['chauffeur', 'mri-viewer', 'myne'] as const;
const faceMatrix = (page: import('@playwright/test').Page, sel: string) =>
	page.locator(sel).first().getAttribute('transform');

test.describe('3D drawings render their final pose without JavaScript', () => {
	test.use({ javaScriptEnabled: false });
	for (const slug of models) {
		test(`${slug}: wire, mapped planes and an occluding face`, async ({ page }) => {
			await page.goto('/');
			const svg = page.locator(`#${slug} svg[data-model]`);
			expect(await svg.locator('.wire path[data-pts]').count()).toBeGreaterThanOrEqual(20);
			expect(await svg.locator('[data-plane]').count()).toBeGreaterThanOrEqual(2);
			expect(await faceMatrix(page, `#${slug} [data-plane]`)).not.toMatch(/^matrix\(1 0 0 1 0 0\)$/);
			expect(await svg.locator('.face-fill').count()).toBeGreaterThanOrEqual(1);
		});
		test(`${slug}: the project page shows the identical final pose (morph matches)`, async ({ page }) => {
			await page.goto('/');
			const home = await page.locator(`#${slug} svg[data-model]`).evaluate((s) => [...s.querySelectorAll('[data-pts]')].map((p) => p.getAttribute('d')).join('|') + [...s.querySelectorAll('[data-plane]')].map((g) => g.getAttribute('transform')).join('|'));
			await page.goto(`/work/${slug}`);
			const work = await page.locator('header svg[data-model]').evaluate((s) => [...s.querySelectorAll('[data-pts]')].map((p) => p.getAttribute('d')).join('|') + [...s.querySelectorAll('[data-plane]')].map((g) => g.getAttribute('transform')).join('|'));
			expect(work).toBe(home);
		});
	}
	test('construction axes turn with the phone (mid plane)', async ({ page }) => {
		await page.goto('/');
		const axes = page.locator('#chauffeur [data-plane] .c').first();
		expect(await axes.evaluate((el) => el.closest('[data-plane]')!.getAttribute('data-plane'))).toBe('0,0,0,1,0,0,0,1,0');
	});
	test('leader starts at the projected button', async ({ page }) => {
		await page.goto('/');
		const pts = await page.locator('#chauffeur polyline[data-anchor]').getAttribute('points');
		expect(pts!.split(' ')[0]).not.toBe('214,177');
	});
});

const nums = (m: string | null) => m!.match(/-?[\d.]+/g)!.map(Number);
test.describe('the turn', () => {
	test.use({ viewport: { width: 1280, height: 900 } });
	test('a 3D drawing turns into its final pose as it draws, then holds the SSR pose', async ({ page }) => {
		await page.goto('/');
		const face = page.locator('#chauffeur [data-plane].face');
		const ssr = await page.evaluate(async () => (await (await fetch('/')).text()).match(/class="face"[^>]*transform="([^"]+)"|transform="([^"]+)"[^>]*class="face"/)!.slice(1).find(Boolean));
		const before = await face.getAttribute('transform');
		expect(before).toBe(ssr); // the build-time pose until the draw starts; the turn begins from FROM only then
		await page.locator('#chauffeur').scrollIntoViewIfNeeded();
		await expect.poll(() => face.getAttribute('transform'), { timeout: 1500, intervals: [20] }).not.toBe(ssr); // mid-turn
		await expect.poll(async () => nums(await face.getAttribute('transform')).map((n, i) => Math.abs(n - nums(ssr!)[i])).every((d) => d < 0.01), { timeout: 4000 }).toBe(true);
	});
	test('reduced motion never turns', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		const face = page.locator('#chauffeur [data-plane].face');
		const t0 = await face.getAttribute('transform');
		await page.locator('#chauffeur').scrollIntoViewIfNeeded();
		await page.waitForTimeout(1500);
		expect(await face.getAttribute('transform')).toBe(t0);
	});
	test('if models.js never loads, the drawing still draws and keeps the SSR pose', async ({ page }) => {
		// deferred scripts run in order, so enhance.js can't start a draw before models.js; the real failure is models.js missing
		await page.route('**/models*.js', (r) => r.abort());
		await page.goto('/');
		const face = page.locator('#chauffeur [data-plane].face');
		const ssr = await face.getAttribute('transform');
		await page.locator('#chauffeur').scrollIntoViewIfNeeded();
		await expect(page.locator('#chauffeur figure.drawing')).toHaveAttribute('data-drawn', '');
		await page.waitForTimeout(2000);
		expect(await face.getAttribute('transform')).toBe(ssr);
		await expect(page.locator('html')).toHaveClass(/\bdraw-ready\b/);
	});
	test('story figures draw fast (finished by 2 s)', async ({ page }) => {
		await page.goto('/');
		await page.locator('#chauffeur').scrollIntoViewIfNeeded();
		await expect(page.locator('#chauffeur figure.drawing')).toHaveAttribute('data-drawn', '');
		const end = await page.locator('#chauffeur .stroke').evaluateAll((els) => Math.max(...els.map((e) => parseFloat((e as HTMLElement).style.getPropertyValue('--t')) + parseFloat((e as HTMLElement).style.getPropertyValue('--d') || '0'))));
		expect(end).toBeLessThanOrEqual(2000);
	});
	test('project pages do not load models.js', async ({ page }) => {
		const urls: string[] = [];
		page.on('request', (r) => urls.push(r.url()));
		await page.goto('/work/chauffeur');
		expect(urls.some((u) => /models[.-][\w-]+\.js/.test(u))).toBe(false);
	});
});

test.describe('stories', () => {
	test.use({ viewport: { width: 1280, height: 900 } });
	const loopParts: Record<string, string> = {
		chauffeur: '.cursor, .btn, .ripple, .st-a, .st-b, .st-tick, .leader-pulse, .stamp, .st-one, .st-zero',
		'mri-viewer': '.st-plane-g, .st-frame, .st-scan, .st-slice, .knob, .st-bridge',
		myne: '.unlock, .st-bolt, .st-check, .st-rec-a, .st-rec-b, .st-clock',
		'hard-pills': '.st-panel, .stamp, .wobble, .grow, .st-arc'
	};
	for (const [slug, sel] of Object.entries(loopParts)) {
		test(`${slug}: every loop part runs on the drawing's one clock, only while live`, async ({ page }) => {
			await page.goto('/');
			const fig = page.locator(`#${slug} figure.drawing`);
			await fig.scrollIntoViewIfNeeded();
			await expect(fig).toHaveAttribute('data-live', '', { timeout: 6000 });
			const durs = await fig.locator(sel).evaluateAll((els) => els.map((e) => getComputedStyle(e).animationDuration));
			const loop = await fig.locator('svg.story').evaluate((s) => getComputedStyle(s).getPropertyValue('--loop').trim());
			expect(new Set(durs)).toEqual(new Set([loop]));
			await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
			await expect(fig).not.toHaveAttribute('data-live', '');
			expect(await fig.locator(sel).evaluateAll((els) => els.every((e) => getComputedStyle(e).animationName === 'none'))).toBe(true);
		});
	}
	test('chauffeur beats: "1 CHANGE" shows mid-loop, then the counter is back to 0', async ({ page }) => {
		await page.goto('/');
		const fig = page.locator('#chauffeur figure.drawing');
		await fig.scrollIntoViewIfNeeded();
		await expect(fig).toHaveAttribute('data-live', '', { timeout: 6000 });
		const at = (f: number) => fig.locator('.st-one').evaluate((el, f) => { const a = el.getAnimations()[0]; a.pause(); a.currentTime = (a.effect!.getTiming().duration as number) * f; return getComputedStyle(el).opacity; }, f);
		expect(await at(0.52)).toBe('1');
		expect(await at(0.7)).toBe('0');
	});
});

/** Pause every animation in a drawing at fraction f of its loop. */
const seek = (page: import('@playwright/test').Page, slug: string, f: number) =>
	page.locator(`#${slug} figure.drawing`).evaluate((fig, f) => {
		for (const a of fig.getAnimations({ subtree: true })) {
			a.pause();
			a.currentTime = ((a.effect!.getTiming().duration as number) || 0) * f;
		}
	}, f);
const live = async (page: import('@playwright/test').Page, slug: string) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/');
	const fig = page.locator(`#${slug} figure.drawing`);
	await fig.scrollIntoViewIfNeeded();
	await expect(fig).toHaveAttribute('data-live', '', { timeout: 6000 });
	return fig;
};

test('mri beats: the slice plane steps down the stack and the readout follows', async ({ page }) => {
	const fig = await live(page, 'mri-viewer');
	const y = () => fig.locator('.st-plane-g').evaluate((g) => (g as SVGGraphicsElement).getBoundingClientRect().top);
	const shown = () => fig.locator('.st-slice').evaluateAll((ts) => ts.filter((t) => getComputedStyle(t).opacity === '1').map((t) => t.textContent));
	await seek(page, 'mri-viewer', 0.08);
	const y0 = await y();
	expect(await shown()).toEqual(['SLICE 115/232']);
	await seek(page, 'mri-viewer', 0.4);
	expect(await y()).toBeGreaterThan(y0 + 40);
	expect(await shown()).toEqual(['SLICE 117/232']);
});

test('mri beats: the slice under the plane lights up, and the viewer shows that same slice', async ({ page }) => {
	const fig = await live(page, 'mri-viewer');
	const lit = () => fig.locator('.st-scan').evaluateAll((ps) => ps.map((p) => getComputedStyle(p).stroke));
	const frame = () => fig.locator('.st-frame').evaluateAll((gs) => gs.findIndex((g) => getComputedStyle(g).opacity === '1'));
	const signal = await fig.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-signal').trim());
	for (const [f, i] of [[0.08, 0], [0.4, 2], [0.7, 4]] as const) {
		await seek(page, 'mri-viewer', f);
		const strokes = await lit();
		expect(strokes.filter((c) => c !== strokes[(i + 1) % 5]).length, `at ${f}`).toBe(1); // exactly one slice lit
		expect(await frame(), `at ${f}`).toBe(i);
	}
	expect(signal).not.toBe('');
});

test('mri viewer faces the reader: its own lean keeps the phone top edge thin', async ({ page }) => {
	await page.goto('/');
	// the phone face's vertical axis stays near-upright (|c| small) and unshrunk (d close to 1): no deep tray look
	const [, , c, d] = (await page.locator('#mri-viewer [data-plane].face').getAttribute('transform'))!.match(/-?[\d.]+/g)!.map(Number);
	expect(Math.abs(c)).toBeLessThan(0.05);
	expect(d).toBeGreaterThan(0.98);
});

/** The door's edges as built (SSR), read from a fresh copy of the page. */
const ssrDoor = (page: import('@playwright/test').Page) =>
	page.evaluate(async () => {
		const doc = new DOMParser().parseFromString(await (await fetch('/')).text(), 'text/html');
		return [...doc.querySelectorAll('#myne [data-part="door"][data-pts]')].map((p) => p.getAttribute('d'));
	});
const liveDoor = (page: import('@playwright/test').Page) =>
	page.locator('#myne [data-part="door"][data-pts]').evaluateAll((ps) => ps.map((p) => p.getAttribute('d')));

test.describe('myne door', () => {
	test('swings open mid-loop and is shut at the start of the loop', async ({ page }) => {
		await live(page, 'myne');
		const ssr = await ssrDoor(page);
		expect(ssr.length).toBeGreaterThan(10);
		await seek(page, 'myne', 0.05);
		await page.waitForTimeout(120);
		expect(await liveDoor(page)).toEqual(ssr);
		await seek(page, 'myne', 0.5);
		await page.waitForTimeout(120);
		const open = await liveDoor(page);
		expect(open.filter((d, i) => d !== ssr[i]).length).toBeGreaterThan(10);
	});
	test('stops (and shuts) when the drawing leaves the screen', async ({ page }) => {
		await live(page, 'myne');
		const ssr = await ssrDoor(page);
		await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
		await expect(page.locator('#myne figure.drawing')).not.toHaveAttribute('data-live', '');
		await page.waitForTimeout(150);
		const a = await liveDoor(page);
		await page.waitForTimeout(400);
		expect(await liveDoor(page)).toEqual(a);
		expect(a).toEqual(ssr);
	});
	test('never moves under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await page.locator('#myne').scrollIntoViewIfNeeded();
		await page.waitForTimeout(1500);
		expect(await liveDoor(page)).toEqual(await ssrDoor(page));
		expect(await page.locator('#myne figure.drawing').evaluate((f) => f.getAnimations({ subtree: true }).length)).toBe(0);
	});
});

test('hard-pills beats: a panel re-inks inside its border; the page is whole at loop start', async ({ page }) => {
	const fig = await live(page, 'hard-pills');
	const panels = () => fig.locator('.st-panel').evaluateAll((g) => g.map((e) => parseFloat(getComputedStyle(e).opacity)));
	const borders = () => fig.locator('rect.stroke').evaluateAll((r) => r.slice(0, 5).map((e) => parseFloat(getComputedStyle(e).strokeDashoffset)));
	await seek(page, 'hard-pills', 0);
	expect(await panels()).toEqual([1, 1, 1, 1]);
	await seek(page, 'hard-pills', 0.12);
	expect((await panels())[0]).toBeLessThan(0.5);
	expect(Math.max(...(await borders()))).toBe(0);
});

test.describe('everyone else sees finished final poses', () => {
	for (const slug of ['chauffeur', 'mri-viewer', 'myne'] as const) {
		test(`${slug}: reduced motion — final pose, drawn, nothing running`, async ({ page }) => {
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await page.goto('/');
			const fig = page.locator(`#${slug} figure.drawing`);
			await fig.scrollIntoViewIfNeeded();
			expect(await fig.evaluate((f) => f.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length)).toBe(0);
			expect(await fig.locator('.stroke').first().evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset))).toBe(0);
			// and it is the build-time pose, not a turn's starting angle
			const ssr = await page.evaluate(async (slug) => {
				const doc = new DOMParser().parseFromString(await (await fetch('/')).text(), 'text/html');
				return [...doc.querySelectorAll(`#${slug} [data-plane]`)].map((g) => g.getAttribute('transform'));
			}, slug);
			expect(await fig.locator('[data-plane]').evaluateAll((gs) => gs.map((g) => g.getAttribute('transform')))).toEqual(ssr);
		});
		test(`${slug}: "All work" return lands on the final pose`, async ({ page }) => {
			await page.goto(`/work/${slug}`);
			const work = await page.locator('header [data-plane]').first().getAttribute('transform');
			await page.getByRole('link', { name: /All work/ }).click();
			await expect(page.locator('html')).toHaveClass(/\brestored\b/);
			expect(await page.locator(`#${slug} [data-plane]`).first().getAttribute('transform')).toBe(work);
		});
	}
});

test.describe('3D drawings never sit at the start angle in view', () => {
	const ssrFace = (page: import('@playwright/test').Page) =>
		page.evaluate(async () => {
			const doc = new DOMParser().parseFromString(await (await fetch('/')).text(), 'text/html');
			return doc.querySelector('#chauffeur [data-plane].face')!.getAttribute('transform');
		});
	test('enhance.js blocked: the safety net shows the build-time pose', async ({ page }) => {
		await page.route('**/enhance*.js', (r) => r.abort());
		await page.goto('/');
		await expect(page.locator('html')).not.toHaveClass(/\bjs\b/, { timeout: 4000 });
		expect(await page.locator('#chauffeur [data-plane].face').getAttribute('transform')).toBe(await ssrFace(page));
	});
	test('scripts arriving after the safety net do not snap drawings back or turn them in view', async ({ page }) => {
		await page.route(/(models|enhance)[.-][\w-]+\.js$/, async (r) => { await new Promise((ok) => setTimeout(ok, 3200)); await r.continue(); });
		await page.goto('/', { waitUntil: 'commit' });
		await page.waitForTimeout(5500);
		await page.locator('#chauffeur').scrollIntoViewIfNeeded();
		await page.waitForTimeout(600);
		expect(await page.locator('#chauffeur [data-plane].face').getAttribute('transform')).toBe(await ssrFace(page));
	});
	test('printing before the drawings are reached shows the build-time pose', async ({ page }) => {
		await page.goto('/');
		await page.emulateMedia({ media: 'print' });
		expect(await page.locator('#chauffeur [data-plane].face').getAttribute('transform')).toBe(await ssrFace(page));
	});
});

test.describe('labels are solid tags above the drawing', () => {
	for (const url of ['/', '/work/myne']) {
		test(`every drawing label sits on a solid tag (${url})`, async ({ page }) => {
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await page.goto(url);
			expect(await page.locator('filter#tag feFlood').count()).toBe(1);
			const filters = await page.locator('figure.drawing text:not(.stamp text, .framed)').evaluateAll((ts) => ts.map((t) => getComputedStyle(t).filter));
			expect(filters.length).toBeGreaterThan(5);
			for (const f of filters) expect(f).toMatch(/url\(.*#tag.*\)/);
			// labels with their own drawn frame: the frame is filled solid instead
			for (const fill of await page.locator('figure.drawing :is(.stamp rect.stroke, .framed-tag)').evaluateAll((rs) => rs.map((r) => getComputedStyle(r).fill)))
				expect(fill).not.toBe('none');
		});
	}
});
