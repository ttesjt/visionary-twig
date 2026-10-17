import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const typescriptFiles = ['**/*.{ts,tsx}'];
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.tsbuildinfo',
      '**/next-env.d.ts',
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
  {
    files: ['packages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['next', 'next/*'], message: 'Framework integration belongs in application hosts.' },
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
