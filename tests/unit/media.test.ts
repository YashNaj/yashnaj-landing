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
