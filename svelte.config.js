import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ fallback: '404.html' }),
		// Inline the (small) stylesheet so first paint doesn't wait on a CSS request
		inlineStyleThreshold: 64 * 1024,
		prerender: {
			// TEMP until Task 8 adds the demo page — remove then.
			handleHttpError: ({ path, message }) => {
				if (path === '/work/mri-viewer/demo') return console.warn(message);
				throw new Error(message);
			}
		}
	}
};
