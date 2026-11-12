import { eslintBase } from './tooling/eslint-base.mjs';

export default [{ ignores: ['**/.local/**'] }, ...eslintBase(import.meta.dirname)];
