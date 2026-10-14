import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

describe('client scripts are fingerprinted', () => {
	it('pages load enhance/carousel from hashed immutable URLs, not from the site root', () => {
		const home = readFileSync('build/index.html', 'utf8');
		const work = readFileSync('build/work/chauffeur.html', 'utf8');
		expect(home).toMatch(/src="[^"]*\/_app\/immutable\/assets\/enhance[.-][\w-]+\.js"/);
		expect(work).toMatch(/src="[^"]*\/_app\/immutable\/assets\/carousel[.-][\w-]+\.js"/);
		expect(existsSync('build/enhance.js')).toBe(false);
		expect(existsSync('build/carousel.js')).toBe(false);
	});
	it('immutable assets get a year-long cache', () => {
		expect(readFileSync('static/_headers', 'utf8')).toMatch(/\/_app\/immutable\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
	});
});

describe('3D model runtime budget', () => {
	it('models.js stays under 1.5 KB gzipped and loads on home only', () => {
		const dir = 'build/_app/immutable/assets';
		const file = readdirSync(dir).find((f) => /^models[.-][\w-]+\.js$/.test(f))!;
		expect(gzipSync(readFileSync(join(dir, file))).length).toBeLessThan(1536);
		expect(readFileSync('build/index.html', 'utf8')).toMatch(/models[.-][\w-]+\.js/);
		expect(readFileSync('build/work/chauffeur.html', 'utf8')).not.toMatch(/models[.-][\w-]+\.js/);
	});
});

describe('services page JS budget', () => {
	it('/services ships under 4 KB gzipped first-party JS', () => {
		const html = readFileSync('build/services.html', 'utf8');
		const urls = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
		expect(urls.some((u) => /quote[.-][\w-]+\.js$/.test(u))).toBe(true);
		let total = gzipSync(html.match(/<script>[\s\S]*?<\/script>/g)?.join('') ?? '').length;
		for (const u of urls) total += gzipSync(readFileSync(join('build', u.replace(/^\.?\//, '')))).length;
		expect(total).toBeLessThan(4 * 1024);
	});
});
