import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

const BUDGET = 30 * 1024;

describe('JS budget', () => {
	it('home page first-load JS is under 30 KB gzipped', () => {
		expect(existsSync('build/index.html')).toBe(true);
		const html = readFileSync('build/index.html', 'utf8');
		const urls = new Set(
			[...html.matchAll(/(?:src|href)="([^"]+\.js)"|import\("([^"]+\.js)"\)/g)].map((m) => m[1] ?? m[2])
		);
		let total = gzipSync(html.match(/<script>[\s\S]*?<\/script>/g)?.join('') ?? '').length;
		for (const url of urls) total += gzipSync(readFileSync(join('build', url.replace(/^\.?\//, '')))).length;
		expect(total).toBeLessThan(BUDGET);
	});
});

describe('render-blocking CSS', () => {
	it('home page inlines its CSS instead of linking a stylesheet', () => {
		const html = readFileSync('build/index.html', 'utf8');
		// SvelteKit keeps a `disabled` placeholder link for client navigation; only enabled ones block render
		const blocking = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].filter((m) => !/\bdisabled\b/.test(m[0]));
		expect(blocking).toEqual([]);
		expect(html).toMatch(/<style[^>]*>[\s\S]*--color-ink/);
	});
});

describe('project page JS budget', () => {
	it('each /work page ships under 4 KB gzipped JS', () => {
		for (const slug of ['chauffeur', 'myne', 'mri-viewer', 'hard-pills']) {
			const html = readFileSync(`build/work/${slug}.html`, 'utf8');
			const urls = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
			let total = gzipSync(html.match(/<script>[\s\S]*?<\/script>/g)?.join('') ?? '').length;
			for (const u of urls) total += gzipSync(readFileSync(join('build', u.replace(/^\.?\//, '')))).length;
			expect(total, slug).toBeLessThan(4 * 1024);
		}
	});
});
