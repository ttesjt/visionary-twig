// Shared test fixtures and factory helpers.
// Import from integration tests as needed.

import type { TemplateOptions } from '../src/types/index.js';

export function makeOptions(overrides?: Partial<TemplateOptions>): TemplateOptions {
  return {
    name: 'test',
    ...overrides,
  };
}
