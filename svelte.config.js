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
			// /demo/** is a static bundle under static/; the crawler can't resolve its extensionless
			// folder URLs (Cloudflare serves them), so don't fail the build on those links.
			handleHttpError: ({ path, message }) => {
				if (path.startsWith('/demo/')) return;
				throw new Error(message);
			}
		}
	}
};
