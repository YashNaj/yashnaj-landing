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

describe('morph choreography', () => {
	const html = readFileSync('src/app.html', 'utf8');
	const block = css.slice(css.indexOf('/* ---------- Cross-document transitions'), css.indexOf('/* the copy button'));
	const ms = (s: string) => [...s.matchAll(/(\d+(?:\.\d+)?)(ms|s)\b/g)].map((m) => Number(m[1]) * (m[2] === 's' ? 1000 : 1));

	it('tags each navigation by direction before first render', () => {
		expect(html).toContain("addEventListener('pagereveal'");
		expect(html).toContain("types.add(dir || (back ? 'back' : 'forward'))");
	});
	it('styles every direction and the two beats', () => {
		for (const t of ['back', 'next', 'prev']) expect(block).toContain(`:active-view-transition-type(${t})`);
		for (const n of ['*.vt-head', '*.vt-body', '*.vt-sheet', '*.vt-title', '*.vt-drawing']) expect(block).toContain(n);
		for (const k of ['vt-fold', 'vt-unfold', 'vt-lift', 'vt-settle', 'vt-rise', 'vt-rise-far']) expect(block).toContain(`@keyframes ${k} `);
	});
	it('no animation in the block runs past 800 ms (duration + delay)', () => {
		expect(block.length).toBeGreaterThan(500);
		expect(block).not.toMatch(/var\(--dur-/); // times are literal so this test can read them
		for (const [, body] of block.matchAll(/\{([^{}]*)\}/g)) {
			const short = body.match(/(?:^|;)\s*animation:\s*([^;]+)/);
			const total = short
				? ms(short[1]).slice(0, 2).reduce((a, b) => a + b, 0)
				: Math.max(...ms(body.match(/animation-duration:\s*([^;]+)/)?.[1] ?? '0ms')) + Math.max(...ms(body.match(/animation-delay:\s*([^;]+)/)?.[1] ?? '0ms'));
			expect(total, body.trim()).toBeLessThanOrEqual(800);
		}
	});
	it('every animation sits behind no-preference, and reduced motion stops them all', () => {
		const outside = block.replace(/@media \(prefers-reduced-motion: (no-preference|reduce)\) \{[\s\S]*?\n\}/g, '');
		expect(outside).not.toMatch(/animation(-name)?:\s*vt-/);
		expect(block).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*::view-transition-group\(\*\),\s*::view-transition-image-pair\(\*\),\s*::view-transition-old\(\*\),\s*::view-transition-new\(\*\) \{ animation: none !important; \}/);
	});
});

describe('MRI scrubber loop', () => {
	it('starts where the static knob sits (centre), so going live does not jump', () => {
		expect(css).toMatch(/@keyframes d-knob \{ 0%, 28% \{ transform: translateX\(0\); \}/);
		expect(css).toMatch(/100% \{ transform: translateX\(0\); \} \}/);
	});
});
