// Copies the stripped-down MRI viewer demo into static/demo/mri and makes it site-relative.
// Usage: bun scripts/media/import-demo.ts <demo source folder>
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2];
const OUT = 'static/demo/mri';
mkdirSync(OUT, { recursive: true });
cpSync(join(SRC, 'mobile'), join(OUT, 'mobile'), { recursive: true });
cpSync(join(SRC, 'study'), join(OUT, 'study'), { recursive: true });

const TITLE = 'MRI/CT Viewer — Demo';
const page = readFileSync(join(SRC, 'demo.html'), 'utf8')
	.replace(/<title>[^<]*<\/title>/, `<title>${TITLE}</title>`)
	.replace('src="/mobile/index.html"', 'src="/demo/mri/mobile/index.html"')
	.replace("fetch(BASE + '/study/index.json')", "fetch(BASE + '/demo/mri/study/index.json')")
	// Open each series mid-stack: slice 1 is the top of the skull, the middle shows the anatomy.
	.replace("cmd({ type:'loadStack', imageIds:s.imageIds, index:0 });", "cmd({ type:'loadStack', imageIds:s.imageIds, index:Math.floor(s.imageIds.length / 2) });")
	// Don't spin forever when the device can't start the viewer (e.g. no WebGL): give up after 15 s.
	.replace(
		"cmd({ type:'loadStack', imageIds:s.imageIds, index:0 });",
		"cmd({ type:'loadStack', imageIds:s.imageIds, index:0 });\n  clearTimeout(window.__loadTimer);\n  window.__loadTimer = setTimeout(() => { if (overlay.style.display !== 'none') overlay.textContent = 'This device could not start the imaging viewer (WebGL unavailable).'; }, 15000);"
	)
	.replace(
		"let series = [], activeId = null, cmdReady = false;",
		"let series = [], activeId = null, cmdReady = false;\nwindow.__loadTimer = setTimeout(() => { if (overlay.style.display !== 'none') overlay.textContent = 'This device could not start the imaging viewer (WebGL unavailable).'; }, 15000);"
	)
	.replace(
		"overlay.textContent = 'Could not load study: ' + e.message;",
		"overlay.textContent = 'Could not load study: ' + e.message; clearTimeout(window.__loadTimer);"
	);
writeFileSync(join(OUT, 'index.html'), page);

const viewer = join(OUT, 'mobile/index.html');
writeFileSync(viewer, readFileSync(viewer, 'utf8').replace(/<title>[^<]*<\/title>/, '<title>MRI/CT Viewer</title>'));

const manifest = join(OUT, 'study/index.json');
writeFileSync(manifest, readFileSync(manifest, 'utf8').replace(/dicomweb:https?:\/\/[^/"]+\/study\//g, 'dicomweb:/demo/mri/study/'));
console.log('imported to', OUT);
