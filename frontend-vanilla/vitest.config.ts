/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/setupTests.ts'],
        // Limit concurrency to avoid resource exhaustion on the VM
        fileParallelism: false,
        pool: 'threads',
    },
});
