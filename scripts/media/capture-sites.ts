// Captures the public Hard Pills to Swallow site for the carousel.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = 'static/media/hard-pills';
mkdirSync(OUT, { recursive: true });
const webp = (png: string, out: string, width: number) => {
	execFileSync('magick', [png, '-resize', `${width}x`, '-quality', '78', out]);
	execFileSync('rm', [png]);
	console.log(out, execFileSync('magick', ['identify', '-format', '%w %h %b', out], { encoding: 'utf8' }));
};
const browser = await chromium.launch();
const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desk.goto('https://hardpillstoswallow.com', { waitUntil: 'networkidle' });
await desk.screenshot({ path: `${OUT}/home.png` });
webp(`${OUT}/home.png`, `${OUT}/home.webp`, 1440);
const article = await desk.locator('a[href*="/articles/"], a[href*="/post"], main a[href^="/"]').first().getAttribute('href');
await desk.goto(new URL(article!, 'https://hardpillstoswallow.com').href, { waitUntil: 'networkidle' });
await desk.screenshot({ path: `${OUT}/article.png` });
webp(`${OUT}/article.png`, `${OUT}/article.webp`, 1440);
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await phone.goto('https://hardpillstoswallow.com', { waitUntil: 'networkidle' });
await phone.screenshot({ path: `${OUT}/mobile.png` });
webp(`${OUT}/mobile.png`, `${OUT}/mobile.webp`, 780);
await browser.close();
