import { mkdtempSync, rmSync, lstatSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assertNewDestination } from '../templates/files.mjs';
import { materializePackages } from '../templates/materialize.mjs';
import { formatProject } from '../templates/format.mjs';
import {
  rewriteDeliveredDocumentation,
  checkDeliveredDocumentation,
  markdownFiles,
} from '../templates/documentation.mjs';
import { extendLockfile } from '../templates/lockfile.mjs';
import { WORKSPACE_RECORD } from '../templates/delivery.mjs';
import { git, requireCleanRepository, changedPaths } from './git.mjs';
import { assertExternalTarget } from './paths.mjs';
import { planTemplateAddition } from './planning.mjs';
import { appendWorkspaceRecord } from './record.mjs';
import { mergeWorkspaceContributions, mergeAdapterBuildPermissions } from './contributions.mjs';
import { lockTarget, publishCandidate } from './transaction.mjs';
import { qualifyWorkspace, runTargetCommand } from './execution.mjs';

/** Prepare and validate away from user custom inputs, then publish one atomic app task. */
export async function appendTemplate(source, target, options, { run = runTargetCommand } = {}) {
  assertExternalTarget(source, target);
  const head = requireCleanRepository(target);
  const unlock = lockTarget(target);
  let scratch;
  let newDirectory;
  let startedTargetInitialization = false;
  try {
    const { plan, newPackages, record } = await planTemplateAddition(source, target, options);
    scratch = mkdtempSync(path.join(tmpdir(), 'template-add-'));
    const candidate = path.join(scratch, 'project');
    git(target, ['clone', '--quiet', '--no-hardlinks', '--no-local', '--', target, candidate]);
    const contributions = await materializePackages(candidate, plan, { packages: newPackages });
    mergeWorkspaceContributions(source, candidate, plan, contributions);
    appendWorkspaceRecord(source, candidate, record, plan);
    const incoming = [...newPackages, ...plan.templates];
    rewriteDeliveredDocumentation(source, candidate, plan, incoming);
    checkDeliveredDocumentation(
      candidate,
      incoming.flatMap((entry) => markdownFiles(path.join(candidate, entry.destination)))
    );
    extendLockfile(source, candidate, plan, incoming);
    mergeAdapterBuildPermissions(source, candidate, plan);
    await formatProject(candidate, [
      ...incoming.map((entry) => entry.destination),
      'package.json',
      'pnpm-workspace.yaml',
      WORKSPACE_RECORD,
    ]);
    await qualifyWorkspace(candidate, { ...options, preset: plan.preset }, run);
    const paths = changedPaths(candidate);
    const rootFiles = new Set([
      'package.json',
      'pnpm-workspace.yaml',
      'pnpm-lock.yaml',
      WORKSPACE_RECORD,
    ]);
    for (const file of paths)
      if (
        !rootFiles.has(file) &&
        !incoming.some((entry) => file.startsWith(entry.destination + '/'))
      )
        throw new Error('Qualification changed preexisting source; refusing publication: ' + file);
    const selection = plan.templates[0];
    newDirectory = path.join(target, selection.destination);
    assertNewDestination(newDirectory);
    const commit = await publishCandidate(
      target,
      candidate,
      head,
      paths,
      'feat(' + selection.appId + '): initialize from ' + selection.id,
      async () => {
        startedTargetInitialization = true;
        await run(
          target,
          selection.type === 'app'
            ? [
                'bootstrap',
                '--app',
                selection.appId,
                '--source',
                'default',
                ...(options.offline ? ['--offline'] : []),
              ]
            : ['install', '--frozen-lockfile', ...(options.offline ? ['--offline'] : [])],
          options
        );
      }
    );
    return { commit, plan };
  } catch (error) {
    // Only disposable outputs under the new app belong to this failed task. User .local is never removed.
    if (
      startedTargetInitialization &&
      git(target, ['rev-parse', 'HEAD']).trim() === head &&
      newDirectory &&
      lstatSync(newDirectory, { throwIfNoEntry: false })?.isDirectory()
    ) {
      for (const name of ['node_modules', '.generated', '.next'])
        rmSync(path.join(newDirectory, name), { recursive: true, force: true });
      try {
        rmdirSync(newDirectory);
      } catch {
        /* A concurrently created user file remains owned by the user. */
      }
    }
    throw error;
  } finally {
    if (scratch) rmSync(scratch, { recursive: true, force: true });
    unlock();
  }
}
