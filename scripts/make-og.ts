import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { projects } from '../src/lib/data/site';

const src = new URL('./og.html', import.meta.url);
const outDir = fileURLToPath(new URL('../static/og/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
async function shot(query: string, out: string) {
	await page.goto(src.href + query);
	await page.evaluate(() => document.fonts.ready);
	await page.screenshot({ path: out, type: 'png' });
	console.log('wrote', out);
}
await shot('', fileURLToPath(new URL('../static/og.png', import.meta.url)));
for (const p of projects) {
	const q = new URLSearchParams({
		eyebrow: `SHEET ${p.sheet} / 04 · YASHAL NAJEEB`,
		title: p.title,
		role: p.tagline,
		site: `YASHNAJ.DEV/WORK/${p.slug.toUpperCase()}`
	});
	await shot(`?${q}`, `${outDir}${p.slug}.png`);
}
await browser.close();
