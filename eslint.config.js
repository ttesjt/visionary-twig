import path from 'node:path';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { discoverApps, discoverTemplateApps } from './tooling/workspace-apps.ts';

const hasNextHosts =
  [...discoverApps(import.meta.dirname), ...discoverTemplateApps(import.meta.dirname)].length > 0;
const nextVitals = hasNextHosts ? (await import('eslint-config-next/core-web-vitals')).default : [];

const typescriptFiles = ['**/*.{ts,tsx}'];
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.open-next/**',
      '**/.generated/**',
      '**/.wrangler/**',
      '**/.local/**',
      '**/coverage/**',
      '**/*.tsbuildinfo',
      '**/next-env.d.ts',
      'packages/templates/node-library/**',
      '.cache/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  { ...js.configs.recommended, files: ['**/*.{js,mjs}'] },
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: typescriptFiles,
  })),
  {
    files: typescriptFiles,
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="style"]',
          message: 'Use semantic classes and variants implemented in @frontend/styles.',
        },
      ],
    },
  },
  ...nextVitals
    .filter((config) => !config.ignores)
    .map((config) => ({
      ...config,
      files: ['apps/*/**/*.{ts,tsx}', 'packages/templates/*/**/*.{ts,tsx}'],
      settings: {
        ...config.settings,
        next: {
          rootDir: [
            path.join(import.meta.dirname, 'apps/*/'),
            path.join(import.meta.dirname, 'packages/templates/*/'),
          ],
        },
      },
    })),
  {
    files: [
      'apps/*/playwright.config.ts',
      'apps/*/test/e2e/**/*.{ts,tsx}',
      'packages/templates/*/playwright.config.ts',
      'packages/templates/*/test/e2e/**/*.{ts,tsx}',
    ],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['./apps/*/tsconfig.e2e.json', './packages/templates/*/tsconfig.e2e.json'],
      },
    },
  },
  {
    files: ['packages/{shared,site,adapters}/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['next', 'next/*'],
              message: 'Framework integration belongs in application hosts.',
            },
            {
              group: ['*.css', '**/*.css', '*.scss', '**/*.scss'],
              message: 'Applications select the global stylesheet.',
            },
          ],
        },
      ],
    },
  }
);
