// Records home → project → back to a GIF for review. Needs `bunx vite preview --port 4190`.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';

const OUT = process.env.MORPH_DIR ?? 'morph';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: OUT, size: { width: 1280, height: 800 } } });
const page = await ctx.newPage();
await page.goto('http://localhost:4190/');
await page.locator('#myne').scrollIntoViewIfNeeded();
await page.waitForTimeout(3500);
await page.locator('#myne').getByRole('link', { name: /View project/ }).click();
await page.waitForTimeout(1800);
await page.goBack();
await page.waitForTimeout(1800);
await ctx.close();
await browser.close();
const webm = readdirSync(OUT).find((f) => f.endsWith('.webm'))!;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${OUT}/${webm}`, '-vf', 'fps=20,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse', `${OUT}/morph.gif`]);
console.log('wrote', `${OUT}/morph.gif`);
