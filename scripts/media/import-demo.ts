// Copies the stripped-down MRI viewer demo into static/demo/mri and makes it site-relative.
// Usage: bun scripts/media/import-demo.ts <demo source folder>
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2];
const OUT = 'static/demo/mri';
mkdirSync(OUT, { recursive: true });
cpSync(join(SRC, 'mobile'), join(OUT, 'mobile'), { recursive: true });
cpSync(join(SRC, 'study'), join(OUT, 'study'), { recursive: true });

// Every edit must match exactly once; a silent no-op would ship a broken demo.
function edit(text: string, file: string, pairs: [string | RegExp, string][]): string {
	for (const [find, replace] of pairs) {
		const hit = typeof find === 'string' ? text.includes(find) : find.test(text);
		if (!hit) throw new Error(`${file}: no match for ${find}`);
		text = text.replace(find, replace);
	}
	return text;
}

const STALL = "The viewer couldn’t start. Try reloading.";
const timer = `setTimeout(() => { if (overlay.style.display !== 'none') overlay.textContent = '${STALL}'; }, 15000)`;

// Cloudflare serves …/index.html at the extensionless URL (drop-trailing-slash), so use those
// URLs directly and never rely on relative paths resolving against them.
const page = edit(readFileSync(join(SRC, 'demo.html'), 'utf8'), 'demo.html', [
	[/<title>[^<]*<\/title>/, '<title>MRI/CT Viewer — Demo</title>'],
	['src="/mobile/index.html"', 'src="/demo/mri/mobile"'],
	["fetch(BASE + '/study/index.json')", "fetch(BASE + '/demo/mri/study/index.json')"],
	[
		'let series = [], activeId = null, cmdReady = false;',
		`let series = [], activeId = null, cmdReady = false;\nwindow.__loadTimer = ${timer};`
	],
	// Open each series mid-stack (slice 1 is the top of the skull) and restart the stall timer per series.
	[
		"cmd({ type:'loadStack', imageIds:s.imageIds, index:0 });",
		`cmd({ type:'loadStack', imageIds:s.imageIds, index:Math.floor(s.imageIds.length / 2) });\n  clearTimeout(window.__loadTimer);\n  window.__loadTimer = ${timer};`
	],
	[
		"overlay.textContent = 'Could not load study: ' + e.message;",
		"overlay.textContent = 'Could not load study: ' + e.message; clearTimeout(window.__loadTimer);"
	]
]);
writeFileSync(join(OUT, 'index.html'), page);

const viewerFile = join(OUT, 'mobile/index.html');
writeFileSync(
	viewerFile,
	edit(readFileSync(viewerFile, 'utf8'), 'mobile/index.html', [
		[/<title>[^<]*<\/title>/, '<title>MRI/CT Viewer</title>'],
		[/src="\.\/assets\//g, 'src="/demo/mri/mobile/assets/']
	])
);

const manifest = join(OUT, 'study/index.json');
writeFileSync(
	manifest,
	edit(readFileSync(manifest, 'utf8'), 'study/index.json', [[/dicomweb:https?:\/\/[^/"]+\/study\//g, 'dicomweb:/demo/mri/study/']])
);
console.log('imported to', OUT);
