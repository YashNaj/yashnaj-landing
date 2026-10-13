import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const src = new URL('./og.html', import.meta.url);
const out = fileURLToPath(new URL('../static/og.png', import.meta.url));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(src.href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out, type: 'png' });
await browser.close();
console.log('wrote', out);
