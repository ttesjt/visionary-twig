import { preparedInputKinds } from '../../../tooling/workspace-apps.ts';
/** Next-only relocation. Called by each template's own initializer. */
export function initializeNextApp(context) {
  const { files, appId, config } = context;
  files.editJson('tsconfig.json', (value) => ({
    ...value,
    extends: files.rootReference('tsconfig.react.json'),
  }));
  files.editJson('tsconfig.e2e.json', (value) => ({
    ...value,
    extends: files.rootReference('tsconfig.e2e.json'),
  }));
  files.editJson('package.json', (value) => {
    const kinds = [...preparedInputKinds(value)];
    if (kinds.length) kinds.push('app');
    return {
      ...value,
      workspaceApp: { ...value.workspaceApp, ...config.app },
      scripts: {
        ...Object.fromEntries(
          Object.entries(value.scripts).filter(([key]) => !key.endsWith(':prepare:custom'))
        ),
        ...Object.fromEntries(
          kinds.flatMap((kind) => [
            [
              kind + ':prepare',
              `node ${files.rootReference('scripts/prepare-app.mjs')} --kind ${kind} --app ${appId}`,
            ],
            [
              kind + ':check',
              `node ${files.rootReference('scripts/prepare-app.mjs')} --kind ${kind} --app ${appId} --check`,
            ],
          ])
        ),
      },
    };
  });
  files.write(
    'vitest.config.ts',
    `export { default } from '${files.rootReference('vitest.config.react.js')}';\n`
  );
  files.write(
    'playwright.config.ts',
    `import path from 'node:path';\nimport { appPlaywrightConfig } from '${files.rootReference('tooling/playwright-app')}';\nexport default appPlaywrightConfig(path.resolve(import.meta.dirname, '${files.rootReference('.')}'), '${appId}');\n`
  );
  return {};
}
