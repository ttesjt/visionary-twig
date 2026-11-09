import type { TemplateOptions } from '../types/index.js';

export function greet(options: TemplateOptions): string {
  return `Hello from ${options.name}!`;
}
