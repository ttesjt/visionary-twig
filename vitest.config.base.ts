import { configDefaults, defineConfig } from 'vitest/config';
import { TYPESCRIPT_EXTENSION_GLOB } from './tooling/typescript-files.js';
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['{src,test}/**/*.{test,spec}.' + TYPESCRIPT_EXTENSION_GLOB],
    exclude: [...configDefaults.exclude, '**/test/e2e/**'],
    clearMocks: true,
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
});
