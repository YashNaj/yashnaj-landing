import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { projects } from '../../src/lib/data/site';

const file = (src: string) => 'static' + src;
const imageDims = (p: string) => execFileSync('magick', ['identify', '-format', '%w %h', p], { encoding: 'utf8' }).trim();
const videoDims = (p: string) =>
	execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=s=x:p=0', p], { encoding: 'utf8' })
		.trim()
		.replace('x', ' ');

describe('slide media', () => {
	for (const p of projects) {
		for (const s of p.slides) {
			if (s.kind === 'cta') continue;
			it(`${p.slug}: ${s.src} exists, matches declared size, and is within budget`, () => {
				expect(existsSync(file(s.src))).toBe(true);
				if (s.kind === 'image') {
					expect(imageDims(file(s.src))).toBe(`${s.width} ${s.height}`);
					const sm = file(s.src.replace(/\.webp$/, '-sm.webp'));
					expect(existsSync(sm), `${sm} (half-width variant)`).toBe(true);
					expect(imageDims(sm).split(' ')[0]).toBe(String(Math.round(s.width / 2)));
					expect(statSync(file(s.src)).size).toBeLessThanOrEqual(150 * 1024);
				} else {
					expect(videoDims(file(s.src))).toBe(`${s.width} ${s.height}`);
					expect(statSync(file(s.src)).size).toBeLessThanOrEqual(1.3 * 1024 * 1024);
					expect(existsSync(file(s.poster))).toBe(true);
					expect(statSync(file(s.poster)).size).toBeLessThanOrEqual(150 * 1024);
				}
			});
		}
	}
});

describe('share cards', () => {
	for (const p of projects) {
		it(`og/${p.slug}.png is 1200×630`, () => {
			expect(imageDims(`static/og/${p.slug}.png`)).toBe('1200 630');
		});
	}
});

describe('first slide (the LCP on a phone)', () => {
	for (const p of projects) {
		const s = p.slides[0];
		if (s.kind === 'cta') continue;
		// the candidates a phone can pick: anything up to 720 px wide (the 1440 px desktop file is never chosen there)
		const files = s.kind === 'image' ? [s.src, s.src.replace(/\.webp$/, '-sm.webp')].filter((f) => Number(imageDims(file(f)).split(' ')[0]) <= 720) : [s.poster];
		it(`${p.slug}: ${files.join(', ')} each ≤ 40 KB`, () => {
			for (const f of files) expect(statSync(file(f)).size, f).toBeLessThanOrEqual(40 * 1024);
		});
	}
});

describe('video posters', () => {
	// posters always download with the page (they cannot be lazy or low priority), so they compete with the LCP
	for (const p of projects) {
		for (const s of p.slides) {
			if (s.kind !== 'video') continue;
			it(`${p.slug}: ${s.poster} ≤ 40 KB`, () => {
				expect(statSync(file(s.poster)).size).toBeLessThanOrEqual(40 * 1024);
			});
		}
	}
});
