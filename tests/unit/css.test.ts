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
	it('tags each navigation forward or back before first render', () => {
		expect(html).toContain("addEventListener('pagereveal'");
		expect(html).toContain("types.add(back ? 'back' : 'forward')");
	});
	it('animates root by direction and groups by class', () => {
		expect(css).toMatch(/:active-view-transition-type\(back\)/);
		for (const c of ['vt-sheet', 'vt-title', 'vt-drawing']) expect(css).toContain(`*.${c}`);
	});
});

describe('MRI scrubber loop', () => {
	it('starts where the static knob sits (centre), so going live does not jump', () => {
		expect(css).toMatch(/@keyframes d-knob \{ 0%, 28% \{ transform: translateX\(0\); \}/);
		expect(css).toMatch(/100% \{ transform: translateX\(0\); \} \}/);
	});
});

describe('scrub switch', () => {
	const html = readFileSync('src/app.html', 'utf8');
	it('is decided in the head before first render, from the same three conditions as the spec', () => {
		expect(html).toContain("CSS.supports('animation-timeline: view()')");
		expect(html).toContain("matchMedia('(prefers-reduced-motion: no-preference)')");
		expect(html).toMatch(/!document\.documentElement\.classList\.contains\('restored'\)[\s\S]*classList\.add\('scrub'\)/);
	});
	it('registers --sp with a finished default', () => {
		expect(css).toMatch(/@property --sp \{ syntax: '<number>'; inherits: true; initial-value: 100; \}/);
	});
});
