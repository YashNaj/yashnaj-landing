import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { transformWithEsbuild } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		{
			// ?url client scripts are copied verbatim; minify them so pages stay inside the JS budget
			name: 'minify-client-scripts',
			apply: 'build',
			async generateBundle(_, bundle) {
				for (const f of Object.values(bundle)) {
					if (f.type === 'asset' && /\/(enhance|carousel|models)\.[\w-]+\.js$/.test(f.fileName)) {
						f.source = (await transformWithEsbuild(String(f.source), f.fileName, { minify: true })).code;
					}
				}
			}
		}
	],
	// client scripts imported with ?url must stay files so they get a hashed, cacheable URL
	build: { assetsInlineLimit: (file) => (file.endsWith('.js') ? false : undefined) },
	test: { include: ['tests/unit/**/*.test.ts'] }
});
