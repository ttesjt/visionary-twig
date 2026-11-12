import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export const typescriptFiles = ['**/*.{ts,tsx}'];

export function eslintBase(root) {
  return [
    {
      ignores: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/*.tsbuildinfo',
        '.cache/**',
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
        parserOptions: { projectService: true, tsconfigRootDir: root },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      },
    },
  ];
}
