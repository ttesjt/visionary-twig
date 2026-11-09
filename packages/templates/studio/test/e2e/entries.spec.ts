import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import { DOCUMENT_COMPONENT_NAMES } from '@frontend/puck-adapter/schema';

test('schema stays pure and public server rendering excludes editor/client entry', () => {
  const output = new URL(import.meta.resolve('@frontend/puck-adapter/schema'));
  // Follow reviewed neutral entries instead of trusting their transitive imports.
  const schemaEntries = [
    '@frontend/content-blocks/schema',
    '@frontend/text-catalog',
    '@frontend/prepared-data',
    '@frontend/ui/layout-options',
    '@frontend/ui-document',
    '@frontend/ui-document/inspection',
  ];
  const visited = new Set<string>();
  function inspect(file: URL): void {
    if (visited.has(file.href)) return;
    visited.add(file.href);
    const source = readFileSync(file, 'utf8');
    expect(source).not.toMatch(/^['"]use client['"]/u);
    for (const match of source.matchAll(/(?:\bfrom\s+|\bimport\s*(?:\(\s*)?)['"]([^'"]+)['"]/gu)) {
      const dependency = match[1];
      if (!dependency) continue;
      if (dependency.startsWith('.')) inspect(new URL(dependency, file));
      else if (dependency !== 'zod') {
        expect(schemaEntries).toContain(dependency);
        inspect(new URL(import.meta.resolve(dependency)));
      }
    }
  }
  inspect(output);
  const result = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "import { contentRegistry } from '@frontend/puck-adapter/schema'; process.stdout.write(JSON.stringify(Object.keys(contentRegistry.nodes).sort()));",
    ],
    { cwd: new URL('../../', import.meta.url), encoding: 'utf8' }
  );
  const registeredNames: unknown = JSON.parse(result.trim());
  expect(registeredNames).toEqual([...DOCUMENT_COMPONENT_NAMES].sort());
  const manifest = readFileSync(
    new URL(
      '../../.next/server/app/[locale]/preview/[id]/page_client-reference-manifest.js',
      import.meta.url
    ),
    'utf8'
  );
  expect(manifest).not.toContain('puck-adapter/dist/editor');
  expect(manifest).not.toContain('@puckeditor/core');
  expect(readFileSync(new URL(import.meta.resolve('@frontend/puck-adapter')), 'utf8')).not.toMatch(
    /^['"]use client['"]/u
  );
  expect(
    readFileSync(new URL(import.meta.resolve('@frontend/puck-adapter/editor')), 'utf8')
  ).toMatch(/^['"]use client['"]/u);
});

test('the workspace shell entry has no Puck, application or storage implementation imports', () => {
  const visited = new Set<string>();
  function inspect(file: URL): void {
    if (visited.has(file.href)) return;
    visited.add(file.href);
    const source = readFileSync(file, 'utf8');
    expect(source).not.toMatch(/@puckeditor|@frontend\/(puck-adapter|cloudflare|storage)/u);
    for (const match of source.matchAll(/from ['"]([^'"]+)['"]/gu)) {
      const dependency = match[1];
      if (dependency?.startsWith('.')) inspect(new URL(dependency, file));
    }
  }
  inspect(new URL(import.meta.resolve('@frontend/studio/shell')));
});

test('session and editor modules do not select file or publication transports', () => {
  const visited = new Set<string>();
  function inspect(file: URL): void {
    if (visited.has(file.href)) return;
    visited.add(file.href);
    const source = readFileSync(file, 'utf8');
    expect(source).not.toMatch(
      /from ['"][^'"]*(?:\/files\/|\/persistence\/|node:|@frontend\/(?:storage|cloudflare))/u
    );
    for (const match of source.matchAll(/from ['"]([^'"]+)['"]/gu)) {
      const dependency = match[1];
      if (dependency?.startsWith('.')) inspect(new URL(dependency, file));
    }
  }
  inspect(new URL(import.meta.resolve('@frontend/studio/session')));
  inspect(new URL(import.meta.resolve('@frontend/studio/json-editor')));
  inspect(new URL(import.meta.resolve('@frontend/studio/viewer')));
  inspect(new URL(import.meta.resolve('@frontend/studio/editor')));
});
