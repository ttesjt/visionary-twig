import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vitest.config.base.js';
export default mergeConfig(
  base,
  defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: [fileURLToPath(new URL('./tooling/test/react-setup.ts', import.meta.url))],
    },
  })
);
