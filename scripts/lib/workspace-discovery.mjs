import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export const DEPENDENCY_GROUPS = [
  'dependencies',
  'peerDependencies',
  'devDependencies',
  'optionalDependencies',
];
export const NODE_WORKSPACE_GROUPS = [{ parent: 'packages', location: 'packages' }];

export function discoverWorkspaces(root, groups) {
  return groups.flatMap(({ parent, accept, ...group }) => {
    const directory = path.join(root, parent);
    if (!existsSync(directory)) return [];
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      if (!entry.isDirectory()) return [];
      const relative = parent + '/' + entry.name;
      const target = path.join(directory, entry.name);
      const file = path.join(target, 'package.json');
      if (!existsSync(file)) return [];
      const manifest = JSON.parse(readFileSync(file, 'utf8'));
      if (accept && !accept(manifest)) return [];
      return [{ directory: target, relative, manifest, ...group }];
    });
  });
}
