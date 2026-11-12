export function initialize({ files }) {
  files.editJson('tsconfig.json', (config) => ({
    ...config,
    extends: files.rootReference('tsconfig.node.json'),
  }));
  files.editText('vitest.config.ts', (config) =>
    config.replace('../../../vitest.config.base.js', files.rootReference('vitest.config.base.js'))
  );
}
