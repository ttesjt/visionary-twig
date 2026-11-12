import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { checkDeliveredDocumentation } from '../templates/documentation.mjs';
import { createTemplateProject } from '../templates/generate.mjs';
import { planProject } from '../templates/plan.mjs';
import {
  assertAppName,
  DEFAULT_LIBRARY_TEMPLATE,
  DEFAULT_APP_NAME,
  DEFAULT_APP_TEMPLATE,
} from '../templates/identities.mjs';
import { NODE_PRESET } from '../templates/presets.mjs';
import { assertNewDestination, copySource } from '../templates/files.mjs';
import { formatProject } from '../templates/format.mjs';
import { WORKSPACE_RECORD } from '../templates/delivery.mjs';
import { assertExternalTarget } from './paths.mjs';
import { createWorkspaceRecord } from './record.mjs';
import { git, commitPaths } from './git.mjs';
import { qualifyWorkspace, runTargetCommand } from './execution.mjs';
import { appendTemplate } from './append.mjs';

/** Create a standalone baseline before calling the same template transaction. */
export async function cloneRepository(
  source,
  destination,
  options = {},
  { run = runTargetCommand } = {}
) {
  const node = options.preset === NODE_PRESET;
  const kind = options.kind ?? (node ? 'library' : 'app');
  const template =
    options.template ?? (kind === 'library' ? DEFAULT_LIBRARY_TEMPLATE : DEFAULT_APP_TEMPLATE);
  const appName = options.appName ?? DEFAULT_APP_NAME;
  if (!options.bare) {
    if (kind === 'app') assertAppName(appName);
    const check = await planProject(source, {
      name: options.name,
      templates: [template],
      preset: options.preset,
      ...(kind === 'app' ? { appNames: { [template]: appName } } : {}),
    });
    if (check.templates.length !== 1 || check.templates[0].type !== kind)
      throw new Error('Choose one app template; library templates use library:clone.');
  }
  assertExternalTarget(source, destination);
  assertNewDestination(destination);
  mkdirSync(path.dirname(destination), { recursive: true });
  const temporary = mkdtempSync(path.join(path.dirname(destination), '.workspace-create-'));
  const candidate = path.join(temporary, 'project');
  let baseCommit;
  try {
    const plan = await createTemplateProject(source, candidate, {
      name: options.name,
      templates: [],
      preset: options.preset,
      allShared: !node,
    });
    createWorkspaceRecord(source, candidate, plan);
    checkDeliveredDocumentation(candidate);
    await formatProject(candidate, [WORKSPACE_RECORD]);
    git(candidate, ['init', '--quiet', '--initial-branch=main']);
    git(candidate, ['var', 'GIT_AUTHOR_IDENT']);
    git(candidate, ['var', 'GIT_COMMITTER_IDENT']);
    await qualifyWorkspace(candidate, { ...options, browser: false }, run);
    // Exclusive directory creation claims a new destination. cp refuses existing files and skips disposable outputs.
    mkdirSync(destination);
    copySource(candidate, destination);
    git(destination, ['init', '--quiet', '--initial-branch=main']);
    await run(
      destination,
      ['install', '--frozen-lockfile', ...(options.offline ? ['--offline'] : [])],
      options
    );
    baseCommit = commitPaths(
      destination,
      git(destination, ['ls-files', '--others', '--exclude-standard', '-z'])
        .split('\0')
        .filter(Boolean),
      node
        ? 'chore(workspace): initialize TypeScript monorepo'
        : 'chore(workspace): initialize frontend monorepo'
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  if (options.bare) return { baseCommit };
  try {
    return {
      baseCommit,
      ...(await appendTemplate(
        source,
        destination,
        {
          ...options,
          appName,
          kind,
          template,
        },
        { run }
      )),
    };
  } catch (cause) {
    throw new Error(
      'The workspace baseline is ready at ' +
        destination +
        '; ' +
        kind +
        ' initialization failed. ' +
        (kind === 'app' ? 'Retry template:clone after resolving the cause: ' : '') +
        cause.message,
      { cause }
    );
  }
}
