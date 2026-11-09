import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { assertNewDestination, rewritePackageNames } from './files.mjs';
import { seedLockfile } from './lockfile.mjs';
import { formatProject } from './format.mjs';
import { planProject } from './plan.mjs';
import { writeWorkspaceConfiguration, copyWorkspaceFoundation } from './delivery.mjs';
import { rewriteDeliveredDocumentation } from './documentation.mjs';
import { materializePackages } from './materialize.mjs';

/** Assemble source in a new directory; execution and Git transactions have a separate owner. */
export async function createTemplateProject(root, destination, options = {}) {
  const plan = await planProject(root, options);
  assertNewDestination(destination);
  const relative = path.relative(root, destination);
  if (!relative.startsWith('..') && !path.isAbsolute(relative))
    throw new Error('Destination cannot be inside the source repository.');
  mkdirSync(path.dirname(destination), { recursive: true });
  mkdirSync(destination);
  try {
    copyWorkspaceFoundation(root, destination);
    const contributions = await materializePackages(destination, plan);
    writeWorkspaceConfiguration(root, destination, plan, contributions);
    rewritePackageNames(destination, Object.entries(plan.mapping.packages));
    rewriteDeliveredDocumentation(root, destination, plan, [...plan.packages, ...plan.templates], {
      foundation: true,
    });
    seedLockfile(root, destination, plan);
    await formatProject(destination);
    return { ...plan, contributions };
  } catch (error) {
    rmSync(destination, { recursive: true, force: true });
    throw error;
  }
}
