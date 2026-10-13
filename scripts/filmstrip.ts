// Usage: bun scripts/filmstrip.ts [slug]  (needs `bunx vite preview --port 4190` running)
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = process.env.FILMSTRIP_DIR ?? 'filmstrips';
mkdirSync(OUT, { recursive: true });
const slugs = process.argv[2] ? [process.argv[2]] : ['chauffeur', 'myne', 'mri-viewer', 'hard-pills'];
const times = [0, 400, 900, 1600, 2600, 4200, 6500];
const browser = await chromium.launch();
for (const slug of slugs) {
	const frames: string[] = [];
	for (const ms of times) {
		const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
		await page.goto('http://localhost:4190/');
		const fig = page.locator(`#${slug} figure.drawing`);
		await fig.scrollIntoViewIfNeeded();
		await page.waitForTimeout(ms);
		const f = `${OUT}/${slug}-${ms}.png`;
		await fig.screenshot({ path: f });
		frames.push(f);
		await page.close();
	}
	execFileSync('magick', [...frames, '-resize', '360x', '+append', `${OUT}/${slug}-strip.png`]);
	console.log('wrote', `${OUT}/${slug}-strip.png`);
}
await browser.close();
