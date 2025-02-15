import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()]
	// added to use ol plugin .73
	// fixes error related to poly2tri-js
	,
	define: {
		global: 'globalThis'
	}
});
