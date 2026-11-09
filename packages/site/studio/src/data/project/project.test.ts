// @vitest-environment node

import { MAX_STUDIO_PROJECT_BYTES } from './schema.js';
import { describe, it, expect } from 'vitest';
import { parseProject, encodeProject, projectFingerprint } from './parse.js';
import { createProject, importProject, projectContext } from './import.js';
import { preparePublication, projectIssues } from './validate.js';
import { project, registry } from '../../../test/data/fixture.js';
describe('portable project format', () => {
  it('round-trips all languages, context, bindings and target independently of locale', () => {
    const input = {
      ...project(),
      context: { assets: { image: '/media/picture.png' } },
      publishing: {
        source: { targetId: 'source', key: 'one', version: { revision: 3 } },
        target: { targetId: 'destination', key: 'two', version: { revision: 7 } },
      },
    };
    const result = parseProject(encodeProject(input), registry);
    expect(result).toEqual({ ok: true, value: input });
    expect(projectFingerprint(input)).toBe(JSON.stringify(input));
    expect(projectContext(input, 'zh')).toEqual({ ...input.context, copy: input.catalogs.zh });
    expect(input.context).not.toHaveProperty('copy');
  });
  it.each([2, 0, '1'])(
    'rejects unknown project versions without layout fallback: %s',
    (version) => {
      const input = project();
      expect(
        importProject(
          { ...input, metadata: { ...input.metadata, formatVersion: version } },
          registry
        ).ok
      ).toBe(false);
    }
  );
  it('rejects declared malformed and unknown project types', () => {
    expect(
      importProject({ ...project(), metadata: { kind: 'other', formatVersion: 1 } }, registry).ok
    ).toBe(false);
    expect(importProject({ ...project(), document: {} }, registry).ok).toBe(false);
    expect(importProject('{', registry).ok).toBe(false);
  });
  it('accepts raw ContentDocument and native Puck Data without adding metadata to their original format', () => {
    const input = project();
    expect(importProject(input.document, registry)).toMatchObject({
      ok: true,
      value: { document: input.document, catalogs: {} },
    });
    expect(importProject(input.document.data, registry, { documentId: 'native' })).toMatchObject({
      ok: true,
      value: { document: { documentId: 'native', data: input.document.data } },
    });
    expect(input.document.data).not.toHaveProperty('metadata');
  });
  it('migrates legacy copy into the declared language without duplicating it', () => {
    const input = project();
    const result = importProject(input.document, registry, {
      locale: 'zh',
      context: { copy: { hero: { title: '文字' } }, assets: { list: [] } },
    });
    expect(result).toMatchObject({
      ok: true,
      value: { catalogs: { zh: { hero: { title: '文字' } } }, context: { assets: { list: [] } } },
    });
  });
  it('rejects competing copy sources rather than overwriting them', () => {
    expect(parseProject({ ...project(), context: { copy: {} } }, registry).ok).toBe(false);
    const input = project();
    expect(
      parseProject({ ...input, document: { ...input.document, variables: { copy: {} } } }, registry)
        .ok
    ).toBe(false);
  });
  it('saves an incomplete project and reports every missing source with locale, component and field', () => {
    const input = { ...project(), catalogs: {} };
    expect(parseProject(input, registry).ok).toBe(true);
    expect(projectIssues(input, registry, 'zh')).toMatchObject([
      {
        code: 'missing-variable',
        nodeId: 'title',
        locale: 'zh',
        sourceKind: 'catalog',
        sourcePath: ['copy', 'hero', 'title'],
        targetPath: ['text'],
      },
    ]);
    expect(preparePublication(input, registry, ['en']).ok).toBe(false);
  });
  it('distinguishes general context from catalog and respects embedded variables', () => {
    const input = project();
    const document = {
      ...input.document,
      variables: { settings: { heading: 'Embedded' } },
      bindings: [{ nodeId: 'title', targetPath: ['text'], sourcePath: ['settings', 'heading'] }],
    };
    expect(projectIssues({ ...input, document }, registry, 'en')).toEqual([]);
    expect(
      projectIssues({ ...input, document: { ...document, variables: {} } }, registry, 'en')
    ).toMatchObject([{ sourceKind: 'context' }]);
  });
  it('publishes only selected languages after validating them, while preserving all loaded languages locally', () => {
    const input = { ...project(), catalogs: { ...project().catalogs, fr: {} } };
    const result = preparePublication(input, registry, ['en', 'zh']);
    expect(result).toMatchObject({ ok: true, value: { locales: ['en', 'zh'] } });
    if (result.ok) {
      expect(Object.keys(result.value.project.catalogs)).toEqual(['en', 'zh']);
      expect(result.value.project).not.toBe(input);
    }
    expect(input.catalogs).toHaveProperty('fr');
    expect(preparePublication(input, registry, ['en', 'fr']).ok).toBe(false);
    expect(preparePublication(input, registry, ['zh']).ok).toBe(false);
  });
  it('does not require catalogs for standalone layouts with direct or embedded values', () => {
    const input = createProject('standalone');
    expect(preparePublication(input, registry, ['en']).ok).toBe(true);
  });
  it('rejects unsupported and accessor values without invoking getters', () => {
    let touched = false;
    const input = project();
    const unsafe = {
      ...input,
      context: {
        get secret() {
          touched = true;
          return 'bad';
        },
      },
    };
    expect(parseProject(unsafe, registry).ok).toBe(false);
    expect(touched).toBe(false);
  });
});

it('rejects accessors before an injected native normalizer can observe them', () => {
  let touched = false;
  let normalized = false;
  const input = {
    get root() {
      touched = true;
      return {};
    },
    content: [],
  };
  const result = importProject(input, registry, {
    normalizePuck: (value) => {
      normalized = true;
      return value;
    },
  });
  expect(result.ok).toBe(false);
  expect(touched).toBe(false);
  expect(normalized).toBe(false);
});

it('does not make a valid near-limit project impossible to reopen through pretty-print overhead', () => {
  const base = { ...createProject('near-limit'), context: { payload: '' } };
  const overhead = new TextEncoder().encode(JSON.stringify(base)).byteLength;
  const input = { ...base, context: { payload: 'x'.repeat(MAX_STUDIO_PROJECT_BYTES - overhead) } };
  expect(parseProject(input, registry).ok).toBe(true);
  const text = encodeProject(input);
  expect(new TextEncoder().encode(text).byteLength).toBeLessThanOrEqual(MAX_STUDIO_PROJECT_BYTES);
  expect(parseProject(text, registry).ok).toBe(true);
});

it('publication inspection keeps raw variables separate from the expanded tree budget', () => {
  const input = createProject('large-published-project');
  const ids = ['first', 'second'];
  const large = {
    ...input,
    document: {
      ...input.document,
      variables: { summary: 'x'.repeat(800_000) },
      data: { root: {}, content: ids.map((id) => ({ type: 'Title', props: { id, text: '' } })) },
      bindings: ids.map((nodeId) => ({ nodeId, targetPath: ['text'], sourcePath: ['summary'] })),
    },
  };
  expect(preparePublication(large, registry, ['en']).ok).toBe(true);
  const tooLarge = {
    ...large,
    document: { ...large.document, variables: { summary: 'x'.repeat(1_100_000) } },
  };
  expect(preparePublication(tooLarge, registry, ['en']).ok).toBe(false);
});
