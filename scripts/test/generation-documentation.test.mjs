import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { createTemplateProject } from '../templates/generate.mjs';
import { checkDeliveredDocumentation } from '../templates/documentation.mjs';
import { parse } from 'yaml';

const source = path.resolve(import.meta.dirname, '../..');
test('bare delivery has complete target guides, preserves common standards and closes package README links', async (context) => {
  const root = mkdtempSync(path.join(tmpdir(), 'delivery-docs-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const target = path.join(root, 'project');
  await createTemplateProject(source, target, {
    templates: [],
    allShared: true,
    name: '@docs/project',
  });
  checkDeliveredDocumentation(target);
  assert.equal(
    readFileSync(path.join(target, 'LICENSE'), 'utf8'),
    readFileSync(path.join(source, 'LICENSE'), 'utf8')
  );
  for (const file of ['code-standards.md', 'monorepo-standards.md'])
    assert.equal(
      readFileSync(path.join(target, 'docs', file), 'utf8'),
      readFileSync(path.join(source, 'docs/common', file), 'utf8')
    );
  for (const file of [
    'commands.md',
    'development.md',
    'architecture.md',
    'repository-conventions.md',
  ])
    assert.ok(existsSync(path.join(target, 'docs', file)));
  for (const file of [
    'docs/common',
    'docs/template-repository',
    'scaffolds',
    'scripts/generation',
    'scripts/templates',
    'packages/templates',
  ])
    assert.equal(existsSync(path.join(target, file)), false);
  assert.doesNotMatch(
    readFileSync(path.join(target, 'eslint.config.js'), 'utf8'),
    /packages\/templates/
  );
  assert.doesNotMatch(
    readFileSync(path.join(target, 'pnpm-lock.yaml'), 'utf8'),
    /wrangler@|@cloudflare\//
  );
  const ci = parse(readFileSync(path.join(target, '.github/workflows/ci.yml'), 'utf8'));
  const steps = ci.jobs.validate.steps;
  assert.ok(steps.filter((step) => step.run?.includes('test:e2e')).every((step) => step.if));
  assert.match(
    readFileSync(path.join(target, 'docs/commands.md'), 'utf8'),
    /template:clone --target/
  );
});
