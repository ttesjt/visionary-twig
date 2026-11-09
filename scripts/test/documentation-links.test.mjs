import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkDocumentationLinks } from '../lib/documentation-links.mjs';

function fixture(context, entries) {
  const root = mkdtempSync(path.join(tmpdir(), 'documentation-links-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [file, contents] of Object.entries(entries)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), contents);
  }
  return root;
}

test('documentation resolves inline, image, reference, encoded and relative fragment links', (context) => {
  const root = fixture(context, {
    'README.md':
      '[guide](docs/guide.md#reader-api)\n[repeat](docs/guide.md#reader-api-1)\n[ref][g]\n[g]: docs/guide.md#explicit\n![image](image.svg)\n[space](<docs/a file.md>)\n[encoded](docs/a%20file.md)\n[percent](docs/100%25.md)\n[hash](docs/a%23b.md)\n[paren](docs/a(file).md "title")\n[home](/docs/guide.md)\n[web](https://example.test/path)\n[mail](mailto:example@example.test)',
    'docs/guide.md': '# Reader API\n# Reader API\n<a id="explicit"></a>\n[local](#reader-api)',
    'docs/a file.md': '# A file',
    'docs/100%.md': '# Percent',
    'docs/a#b.md': '# Hash',
    'docs/a(file).md': '# Parentheses',
    'image.svg': '<svg/>',
  });
  assert.deepEqual(checkDocumentationLinks(root), []);
});

test('documentation reports missing files, fragments, unsafe paths with locations', (context) => {
  const root = fixture(context, {
    'README.md':
      '[missing](missing.md)\n[fragment](present.md#absent)\n[ref][unknown]\n[outside](../outside.md)\n[encoding](bad%ZZ.md)',
    'present.md': '# Exists',
  });
  const errors = checkDocumentationLinks(root);
  assert.deepEqual(
    errors.map((error) => error.message),
    [
      'Missing local destination',
      'Missing Markdown fragment',
      'Destination escapes project',
      'Invalid URL encoding',
    ]
  );
  assert.deepEqual(
    errors.map((error) => [error.file, error.line]),
    [1, 2, 4, 5].map((line) => ['README.md', line])
  );
});

test('code examples and ignored runtime/build directories do not create documentation links', (context) => {
  const root = fixture(context, {
    'README.md':
      '.ui-action-link[data-kind][data-icon]\n```md\n[example](absent.md)\n```\n`[example](absent.md)`\n~~~md\n[example](absent.md)\n~~~',
    '.local/README.md': '[private](absent.md)',
    '.generated/README.md': '[generated](absent.md)',
    'node_modules/example/README.md': '[dependency](absent.md)',
    'dist/README.md': '[output](absent.md)',
  });
  assert.deepEqual(checkDocumentationLinks(root), []);
});

test('selected-document checks preserve unrelated user-owned Markdown', (context) => {
  const root = fixture(context, {
    'README.md': '[unfinished](missing.md)',
    'apps/editor/README.md': '[API](../../docs/api.md#reader)',
    'docs/api.md': '# Reader',
  });
  assert.equal(checkDocumentationLinks(root).length, 1);
  assert.deepEqual(checkDocumentationLinks(root, [path.join(root, 'apps/editor/README.md')]), []);
});
