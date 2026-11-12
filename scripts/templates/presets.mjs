import path from 'node:path';

export const FRONTEND_PRESET = 'frontend';
export const NODE_PRESET = 'node';
const scaffolds = {
  [FRONTEND_PRESET]: 'scaffolds/monorepo',
  [NODE_PRESET]: 'scaffolds/node',
};

export function scaffoldDirectory(root, preset = FRONTEND_PRESET) {
  if (!Object.hasOwn(scaffolds, preset)) throw new Error('Unsupported workspace preset: ' + preset);
  return path.join(root, scaffolds[preset]);
}
