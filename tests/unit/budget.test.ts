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
