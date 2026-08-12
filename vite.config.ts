import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		})
	],
	server: {
		// Fijo, no el 5173 default - mismo motivo que chaturlist-front: evitar
		// instancias huerfanas saltando de puerto en puerto en silencio.
		port: 1020,
		strictPort: true,
		proxy: {
			// El front llama /api/* y Vite lo reenvia a la API de ofer. Asi en
			// dev no hay CORS que pelear.
			'/api': {
				target: process.env['API_TARGET'] ?? 'http://127.0.0.1:8020',
				changeOrigin: true,
				rewrite: (ruta) => ruta.replace(/^\/api/, '')
			}
		}
	}
});
