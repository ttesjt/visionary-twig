import { checkPackageWorkspace, libraryPolicy } from './package-policy.mjs';
import { NODE_WORKSPACE_GROUPS } from './workspace-discovery.mjs';

export function checkNodeWorkspace(root, { checkExports = true } = {}) {
  return checkPackageWorkspace(root, {
    groups: NODE_WORKSPACE_GROUPS,
    policies: { 'node-library': libraryPolicy },
    checkExports,
  });
}
