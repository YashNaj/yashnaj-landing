// Downloads Myne Global's official App Store screenshots and stores them as WebP.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'static/media/myne';
mkdirSync(OUT, { recursive: true });
const res = await fetch('https://itunes.apple.com/lookup?id=6757202169&country=us');
const app = (await res.json()).results[0];
const urls: string[] = app.screenshotUrls;
for (const [i, url] of urls.entries()) {
	const big = url.replace(/\/[^/]+$/, '/1290x0w.png');
	const png = `${OUT}/myne-${i + 1}.png`;
	writeFileSync(png, Buffer.from(await (await fetch(big)).arrayBuffer()));
	execFileSync('magick', [png, '-resize', '600x', '-quality', '80', `${OUT}/myne-${i + 1}.webp`]);
	execFileSync('rm', [png]);
	console.log(`myne-${i + 1}.webp`, execFileSync('magick', ['identify', '-format', '%w %h %b', `${OUT}/myne-${i + 1}.webp`], { encoding: 'utf8' }));
}
