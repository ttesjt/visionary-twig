import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkFeatureBoundaries } from '../../lib/feature-boundaries/check.mjs';

export function featureFixture(context) {
  const root = mkdtempSync(path.join(tmpdir(), 'feature-boundaries-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const workspace = {
    directory: path.join(root, 'packages/shared/sample'),
    manifest: {
      name: '@sample/library',
      exports: { '.': './dist/index.js' },
      workspaceFeatures: {
        'src/projects': { public: ['index.ts'], shared: ['schemas/index.ts'] },
        'src/projects/browsing': { public: ['index.ts'] },
        'src/projects/editing': { public: ['index.ts'] },
      },
    },
    files: [],
  };
  mkdirSync(workspace.directory, { recursive: true });
  function write(relative, content = 'export {};') {
    const file = path.join(workspace.directory, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
    if (!workspace.files.includes(file)) workspace.files.push(file);
    return file;
  }
  for (const file of [
    'src/index.ts',
    'src/projects/index.ts',
    'src/projects/schemas/index.ts',
    'src/projects/browsing/index.ts',
    'src/projects/browsing/internal.ts',
    'src/projects/editing/index.ts',
  ])
    write(file);
  write('tsconfig.json', {
    compilerOptions: {
      module: 'ESNext',
      moduleResolution: 'Bundler',
      paths: { '@/*': ['./src/*'] },
      resolveJsonModule: true,
    },
  });
  const workspaces = [workspace];
  return {
    root,
    workspaces,
    workspace,
    write,
    scopes: workspace.manifest.workspaceFeatures,
    check: () =>
      checkFeatureBoundaries(
        root,
        workspaces,
        new Map(workspaces.map((entry) => [entry.manifest.name, entry]))
      ),
  };
}
