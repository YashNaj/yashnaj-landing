import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync('static/demo/mri/index.html', 'utf8');
const viewer = readFileSync('static/demo/mri/mobile/index.html', 'utf8');
const selectSeries = page.slice(page.indexOf('function selectSeries'), page.indexOf('function buildChrome'));

describe('imported MRI demo', () => {
	it('opens each series mid-stack and resets the load timer per series', () => {
		expect(selectSeries).toContain('Math.floor(s.imageIds.length / 2)');
		expect(selectSeries).toContain('clearTimeout(window.__loadTimer)');
	});

	it('does not blame the visitor’s device when loading stalls', () => {
		expect(page).not.toContain('WebGL unavailable');
		expect(page).toContain('The viewer couldn’t start. Try reloading.');
	});

	it('loads the viewer bundle by absolute path so redirects can’t break it', () => {
		expect(viewer).toContain('src="/demo/mri/mobile/assets/');
		expect(viewer).not.toContain('src="./assets/');
	});
});
