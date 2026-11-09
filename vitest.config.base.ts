import { configDefaults, defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'test/**/*.{test,spec}.{ts,tsx}'],
    exclude: [...configDefaults.exclude, '**/test/e2e/**'],
    clearMocks: true,
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
});
