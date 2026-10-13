import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// client scripts imported with ?url must stay files so they get a hashed, cacheable URL
	build: { assetsInlineLimit: (file) => (file.endsWith('.js') ? false : undefined) },
	test: { include: ['tests/unit/**/*.test.ts'] }
});
