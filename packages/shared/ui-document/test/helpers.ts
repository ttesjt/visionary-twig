import { expect } from 'vitest';
import type { ContentBinding, ContentResult, JsonObject } from '@frontend/ui-document';
import { fixture } from './fixtures.js';

export function unwrap<T>(result: ContentResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

export function code(result: ContentResult<unknown>): string | undefined {
  expect(result.ok).toBe(false);
  return result.ok ? undefined : result.errors[0]?.code;
}

export function withBindings(bindings: readonly ContentBinding[]) {
  return { ...fixture(), bindings };
}

export function simple(props: JsonObject = { text: 'Static', level: 2 }) {
  return {
    documentId: 'static',
    schemaVersion: 1,
    revision: 1,
    data: { root: {}, content: [{ type: 'Heading', props: { id: 'title', ...props } }] },
  };
}
