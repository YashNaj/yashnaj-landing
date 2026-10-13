import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ fallback: '404.html' }),
		prerender: {
			// TEMP until Task 7 adds the resume PDF — remove then.
			handleHttpError: ({ path, message }) => {
				if (path === '/Yashal-Najeeb-Resume.pdf') return console.warn(message);
				throw new Error(message);
			}
		}
	}
};
