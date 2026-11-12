import path from 'node:path';
import { eslintBase, typescriptFiles } from './tooling/eslint-base.mjs';
import { discoverApps } from './tooling/workspace-apps.ts';

const hasNextHosts = discoverApps(import.meta.dirname).length > 0;
const nextVitals = hasNextHosts ? (await import('eslint-config-next/core-web-vitals')).default : [];

export default [
  ...eslintBase(import.meta.dirname),
  {
    ignores: [
      '**/.next/**',
      '**/.open-next/**',
      '**/.generated/**',
      '**/.wrangler/**',
      '**/.local/**',
      '**/next-env.d.ts',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  {
    files: typescriptFiles,
    rules: {
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
      files: ['apps/*/**/*.{ts,tsx}'],
      settings: {
        ...config.settings,
        next: {
          rootDir: [path.join(import.meta.dirname, 'apps/*/')],
        },
      },
    })),
  {
    files: ['apps/*/playwright.config.ts', 'apps/*/test/e2e/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['./apps/*/tsconfig.e2e.json'],
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
  },
];
