import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), Hmr()]
	// added to use ol plugin .73
	// fixes error related to poly2tri-js
	,
	define: {
		global: 'globalThis'
	}
});


function Hmr() {
	return {
		name: 'hmr',
		enforce: 'post',
		handleHotUpdate({ file, server }) {
			console.log(file)
			if (file.endsWith('.json')) {
				server.ws.send({
					type: 'full-reload',
					path: '*'
				});
			}
		}
	};
}