import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/app.css', 'utf8');

describe('motion tokens', () => {
	it('defines the easing and duration tokens once', () => {
		for (const t of ['--ease-out:', '--ease-in-out:', '--ease-draw:', '--ease-pop:', '--dur-xs:', '--dur-s:', '--dur-m:', '--dur-l:', '--color-construct:']) {
			expect(css.split(t).length - 1, t).toBe(1);
		}
	});
	it('uses no raw cubic-bezier outside the token definitions', () => {
		expect(css.match(/cubic-bezier\(/g)!.length).toBe(4);
	});
});
