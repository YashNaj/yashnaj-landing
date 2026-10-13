import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const TERMS_FILE = '.confidential-terms';
const terms = existsSync(TERMS_FILE)
	? readFileSync(TERMS_FILE, 'utf8')
			.split('\n')
			.map((t) => t.trim().toLowerCase())
			.filter(Boolean)
	: [];

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const p = join(dir, name);
		return statSync(p).isDirectory() ? walk(p) : [p];
	});
}

function textOf(file: string): string {
	if (file.endsWith('.pdf')) return execFileSync('pdftotext', [file, '-'], { encoding: 'utf8' });
	if (/\.(png|webp|jpg|woff2?|ico)$/.test(file)) return file; // binary: check the file name only
	return file + '\n' + readFileSync(file, 'utf8');
}

describe.skipIf(terms.length === 0)('confidentiality', () => {
	it('build output exists', () => {
		expect(existsSync('build/index.html')).toBe(true);
	});

	it('no confidential term appears in any built file, file name, or the resume text', () => {
		const hits: string[] = [];
		for (const file of walk('build')) {
			const text = textOf(file).toLowerCase();
			for (const t of terms) if (text.includes(t)) hits.push(`${file}: ${t}`);
		}
		expect(hits).toEqual([]);
	});

	it('the resume is present and still reads as Yashal’s resume', () => {
		const text = execFileSync('pdftotext', ['static/Yashal-Najeeb-Resume.pdf', '-'], { encoding: 'utf8' });
		expect(text).toContain('Yashal Najeeb');
		expect(text).toContain('Healthcare records platform');
		expect(text).toContain('Myne Global');
	});

	it('the resume PDF title is Yashal’s name, not a template name', () => {
		const info = execFileSync('pdfinfo', ['static/Yashal-Najeeb-Resume.pdf'], { encoding: 'utf8' });
		expect(info).toMatch(/^Title:\s+Yashal Najeeb — Resume$/m);
	});
});

if (terms.length === 0) console.warn('[confidentiality] .confidential-terms missing — scan skipped');
