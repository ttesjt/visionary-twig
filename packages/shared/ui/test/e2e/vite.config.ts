import { createRequire } from 'node:module';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);
const styles = [
  '@frontend/ui/default.css',
  '@frontend/styles/default.css',
  '@frontend/ui/web-shell.css',
  '@frontend/styles/web-shell.css',
];
export default defineConfig({
  root: import.meta.dirname,
  esbuild: { jsx: 'automatic' },
  plugins: [
    {
      name: 'header-fixture-styles',
      transformIndexHtml: (_, { originalUrl, path }) => {
        const url = new URL(originalUrl ?? path, 'http://localhost');
        const entries = url.searchParams.has('mono')
          ? [...styles, '@frontend/styles/themes/mono.css']
          : styles;
        return entries.map((entry) => ({
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: '/@fs/' + require.resolve(entry),
          },
          injectTo: 'head' as const,
        }));
      },
    },
  ],
});
