import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { checkDeliveredDocumentation } from '../templates/documentation.mjs';
import { createTemplateProject } from '../templates/generate.mjs';
import { planProject } from '../templates/plan.mjs';
import { assertAppName } from '../templates/identities.mjs';
import { assertNewDestination, copySource } from '../templates/files.mjs';
import { DEFAULT_APP_NAME, DEFAULT_APP_TEMPLATE } from '../templates/identities.mjs';
import { formatProject } from '../templates/format.mjs';
import { WORKSPACE_RECORD } from '../templates/delivery.mjs';
import { assertExternalTarget } from './paths.mjs';
import { createWorkspaceRecord } from './record.mjs';
import { git, commitPaths } from './git.mjs';
import { qualifyWorkspace, runTargetCommand } from './execution.mjs';
import { appendTemplate } from './append.mjs';

/** Create a standalone baseline before calling the same public app-add pipeline. */
export async function cloneRepository(
  source,
  destination,
  options = {},
  { run = runTargetCommand } = {}
) {
  if (!options.bare) {
    const appName = options.appName ?? DEFAULT_APP_NAME;
    const template = options.template ?? DEFAULT_APP_TEMPLATE;
    assertAppName(appName);
    const check = await planProject(source, {
      name: options.name,
      templates: [template],
      ...(options.kind === 'library' ? {} : { appNames: { [template]: appName } }),
    });
    if (check.templates.length !== 1 || check.templates[0].type !== (options.kind ?? 'app'))
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
      allShared: true,
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
      'chore(workspace): initialize frontend monorepo'
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
          appName: options.appName ?? DEFAULT_APP_NAME,
          template: options.template ?? DEFAULT_APP_TEMPLATE,
        },
        { run }
      )),
    };
  } catch (cause) {
    throw new Error(
      'The bare workspace is ready at ' +
        destination +
        '; app initialization failed. Retry template:clone after resolving the cause: ' +
        cause.message,
      { cause }
    );
  }
}
