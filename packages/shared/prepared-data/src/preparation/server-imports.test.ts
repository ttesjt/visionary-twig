import { expect, it } from 'vitest';
import { createServerImportMap } from './server-imports.js';
it('generates deterministic literal imports and rejects unsafe or duplicate module specifiers', () => {
  expect(createServerImportMap(['zh/demo.json', 'en/main.json'])).toContain(
    '"en/main.json": () => import("./en/main.json")'
  );
  expect(createServerImportMap(['zh/demo.json', 'en/main.json'])).toBe(
    createServerImportMap(['en/main.json', 'zh/demo.json'])
  );
  for (const files of [
    ['../secret.json'],
    ['/secret.json'],
    ['a.json', 'a.json'],
    ['x.json";alert(1)'],
  ])
    expect(() => createServerImportMap(files)).toThrow(/Invalid/);
});
