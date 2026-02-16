
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
    base: '/v3/',
    server: {
        proxy: {
            '/api': 'http://127.0.0.1:4994',
            '/image': 'http://127.0.0.1:4994',
        },
    },
    build: {
        outDir: '../web/dist/v3',
        emptyOutDir: true
    }
});
