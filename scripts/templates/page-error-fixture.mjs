import assert from 'node:assert/strict';
import {
  existsSync,
  lstatSync,
  realpathSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

const CACHE = '.cache/page-error-verification';
const PAGE_ROOT = 'src/app/[locale]';
const ROUTES = {
  [PAGE_ROOT + '/verification-server-error/page.tsx']: `
import { existsSync } from 'node:fs';
import { connection } from 'next/server';
export default async function Page() {
  await connection();
  if (existsSync('${CACHE}/page')) throw new Error('private-page-error-detail');
  return <h1>Recovered page</h1>;
}`,
  [PAGE_ROOT + '/verification-client-error/page.tsx']: `
'use client';
import { useState } from 'react';
import Link from 'next/link';
export default function Page() {
  const [failed, setFailed] = useState(false);
  if (failed) throw new Error('private-client-error-detail');
  return <main><button onClick={() => setFailed(true)}>Crash page</button><Link href="/verification-missing">Missing link</Link></main>;
}`,
  [PAGE_ROOT + '/verification-root-client.tsx']: `
'use client';
import { useState } from 'react';
export function VerificationRootClient() {
  const [failed, setFailed] = useState(false);
  if (failed) throw new Error('private-provider-error-detail');
  return <button onClick={() => setFailed(true)}>Crash root</button>;
}`,
};
const OWNED_PATHS = Object.keys(ROUTES).map((name) =>
  name.endsWith('/page.tsx') ? path.dirname(name) : name
);

/** Faults belong only to a fresh generated verification project, never a source worktree. */
export function installPageErrorFixture(root, app, { verificationParent } = {}) {
  const physicalRoot = realpathSync(root);
  const relativeApp = path.relative(physicalRoot, realpathSync(app.directory));
  assert.ok(
    relativeApp &&
      relativeApp !== '..' &&
      !relativeApp.startsWith('..' + path.sep) &&
      !path.isAbsolute(relativeApp),
    'Fault injection must stay inside its disposable clone.'
  );
  if (existsSync(path.join(root, '.git'))) {
    assert.ok(
      lstatSync(path.join(root, '.git')).isDirectory() && typeof verificationParent === 'string',
      'Error verification requires a disposable clone in an explicit verification area.'
    );
    const relative = path.relative(realpathSync(verificationParent), physicalRoot);
    assert.ok(
      relative &&
        relative !== '..' &&
        !relative.startsWith('..' + path.sep) &&
        !path.isAbsolute(relative),
      'Error verification requires a disposable clone inside its owned area.'
    );
    assert.ok(
      existsSync(path.join(root, '.workspace-template.json')) &&
        !existsSync(path.join(root, 'packages/templates')),
      'Error verification requires a disposable generated clone, never the template source repository.'
    );
  }
  const directory = path.join(app.directory, CACHE);
  assert.equal(existsSync(directory), false, 'Verification control directory already exists.');
  for (const name of OWNED_PATHS)
    assert.equal(
      existsSync(path.join(app.directory, name)),
      false,
      'Verification route already exists.'
    );
  const layoutPath = path.join(app.directory, PAGE_ROOT, 'layout.tsx');
  const original = readFileSync(layoutPath, 'utf8');
  const metadataMarker = '  return siteMetadata(await resourceRouteLocale(params));';
  const layoutMarker = '  const locale = await resourceRouteLocale(params);';
  const childMarker = '          <TrackingInitialization />';
  for (const marker of [metadataMarker, layoutMarker, childMarker])
    assert.equal(
      original.split(marker).length,
      2,
      'Root Layout integration changed: update verification fixture.'
    );
  let layout =
    `import { existsSync } from 'node:fs';\nimport { connection } from 'next/server';\nimport { VerificationRootClient } from './verification-root-client';\n` +
    original;
  layout = layout
    .replace(
      metadataMarker,
      `  await connection();\n  if (existsSync('${CACHE}/metadata')) throw new Error('private-metadata-error-detail');\n` +
        metadataMarker
    )
    .replace(
      layoutMarker,
      `  await connection();\n  if (existsSync('${CACHE}/root')) throw new Error('private-resource-error-detail');\n` +
        layoutMarker
    )
    .replace(childMarker, childMarker + '\n          <VerificationRootClient />');
  mkdirSync(directory, { recursive: true });
  try {
    for (const [name, content] of Object.entries(ROUTES)) {
      const filename = path.join(app.directory, name);
      mkdirSync(path.dirname(filename), { recursive: true });
      writeFileSync(filename, content);
    }
    writeFileSync(layoutPath, layout);
  } catch (error) {
    restore();
    throw error;
  }
  function restore() {
    writeFileSync(layoutPath, original);
    for (const name of OWNED_PATHS)
      rmSync(path.join(app.directory, name), { recursive: true, force: true });
    rmSync(directory, { recursive: true, force: true });
  }
  return {
    setFailure(name, active) {
      assert.ok(['page', 'root', 'metadata'].includes(name), 'Unknown fixture failure.');
      const file = path.join(directory, name);
      if (active) writeFileSync(file, 'test failure');
      else rmSync(file, { force: true });
    },
    restore,
  };
}
