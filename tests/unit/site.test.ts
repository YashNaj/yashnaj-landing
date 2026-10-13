import { describe, expect, it } from 'vitest';
import { alsoBuilt, experience, profile, projects } from '../../src/lib/data/site';

describe('site data', () => {
	it('every project has a search description of 70–170 characters that does not just repeat tagline and metric', () => {
		for (const p of projects) {
			expect(p.seoDescription.length, p.slug).toBeGreaterThanOrEqual(70);
			expect(p.seoDescription.length, p.slug).toBeLessThanOrEqual(170);
			expect(p.seoDescription).not.toBe(`${p.tagline} ${p.metric}`);
		}
	});
	it('has exactly the four hero projects in sheet order', () => {
		expect(projects.map((p) => p.slug)).toEqual(['chauffeur', 'myne', 'mri-viewer', 'hard-pills']);
		expect(projects.map((p) => p.sheet)).toEqual(['01', '02', '03', '04']);
	});

	it('every project has the fields a sheet renders', () => {
		for (const p of projects) {
			expect(p.title.length).toBeGreaterThan(0);
			expect(p.summary.length).toBeGreaterThan(40);
			expect(p.metric.length).toBeGreaterThan(0);
			expect(p.stack.length).toBeGreaterThan(0);
			expect(p.drawingLabel.length).toBeGreaterThan(10);
			for (const l of p.links) expect(l.href).toMatch(/^https:\/\//);
		}
	});

	it('the MRI project has no outbound links', () => {
		expect(projects.find((p) => p.slug === 'mri-viewer')!.links).toEqual([]);
	});

	it('profile contact details match the spec', () => {
		expect(profile.email).toBe('yashnaj@proton.me');
		expect(profile.github).toBe('https://github.com/YashNaj');
		expect(profile.linkedin).toBe('https://www.linkedin.com/in/yashnaj');
		expect(profile.resume).toBe('/Yashal-Najeeb-Resume.pdf');
	});

	it('profile states availability', () => {
		expect(profile.availability).toMatch(/open to/i);
	});

	it('shipped apps link to their App Store listings', () => {
		const appStore = /^https:\/\/apps\.apple\.com\/us\/app\/[a-z0-9-]+\/id\d+$/;
		expect(projects.find((p) => p.slug === 'myne')!.links.some((l) => appStore.test(l.href))).toBe(true);
		for (const name of ['Serveus', 'Rider365']) {
			expect(alsoBuilt.find((a) => a.name === name)!.href).toMatch(appStore);
		}
	});

	it('chauffeur links to its benchmark demo', () => {
		expect(projects.find((p) => p.slug === 'chauffeur')!.links.map((l) => l.href)).toContain(
			'https://github.com/YashNaj/chauffeur#benchmark'
		);
	});

	it('lists also-built and experience entries', () => {
		expect(alsoBuilt.map((a) => a.name)).toEqual(['Serveus', 'Rider365', 'AutoAce', 'FieldDiligence']);
		expect(experience).toHaveLength(3);
	});
	it('every project has a four-part write-up', () => {
		for (const p of projects) {
			for (const k of ['problem', 'built', 'how', 'outcome'] as const) {
				expect(p.detail[k].length, `${p.slug}.${k}`).toBeGreaterThan(60);
			}
		}
	});

	it('every project has at least three slides with alt text and captions', () => {
		for (const p of projects) {
			expect(p.slides.length, p.slug).toBeGreaterThanOrEqual(3);
			for (const s of p.slides) {
				expect(s.caption.length).toBeGreaterThan(3);
				if (s.kind !== 'cta') expect(s.alt.length).toBeGreaterThan(10);
			}
		}
	});

	it('the MRI project links to the live demo', () => {
		const mri = projects.find((p) => p.slug === 'mri-viewer')!;
		expect(mri.demo?.href).toBe('/work/mri-viewer/demo');
		expect(mri.slides.some((s) => s.kind === 'cta' && s.href === '/work/mri-viewer/demo')).toBe(true);
	});
});
