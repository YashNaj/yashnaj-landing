// Captures three states of the hosted MRI demo (run `bun run build && bunx vite preview --port 4180` first).
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = 'static/media/mri';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:4180/demo/mri');
const label = page.locator('#sliceLabel');
await label.filter({ hasText: '/ 22' }).waitFor({ timeout: 30000 });
const shot = async (name: string) => {
	await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
	await page.waitForTimeout(800);
	await page.screenshot({ path: `${OUT}/${name}.png` });
	execFileSync('magick', [`${OUT}/${name}.png`, '-quality', '76', `${OUT}/${name}.webp`]);
	execFileSync('rm', [`${OUT}/${name}.png`]);
	console.log(name, execFileSync('magick', ['identify', '-format', '%w %h %b', `${OUT}/${name}.webp`], { encoding: 'utf8' }));
};
await page.locator('#slice').fill('11');
await page.locator('#slice').dispatchEvent('input');
await shot('series');
await page.locator('#strip .chip').nth(6).click();
await label.filter({ hasText: '/ 100' }).waitFor({ timeout: 30000 });
await page.locator('#slice').fill('52');
await page.locator('#slice').dispatchEvent('input');
await shot('volume');
await page.locator('#strip .chip').nth(1).click();
await label.filter({ hasText: '/ 22' }).waitFor({ timeout: 30000 });
await page.locator('#t-wwwc').click();
await page.locator('#slice').fill('12');
await page.locator('#slice').dispatchEvent('input');
await shot('flair');
await browser.close();
