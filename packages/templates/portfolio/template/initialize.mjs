import { initializeNextApp } from '../../../../scripts/templates/initializers/next.mjs';

export function initialize(context) {
  const { files, appId, mapping } = context;
  files.editText('README.md', (text) => text.replaceAll('{{appId}}', appId));
  const requirements = initializeNextApp(context);
  // Selected demo declarations become regular app-owned Content/Text/public inputs.
  files.editText('src/site/project-data.ts', (text) => text.replaceAll('template/demo/', ''));
  const adapters = ['@frontend/node-storage', '@frontend/cloudflare'];
  files.editJson('package.json', (manifest) => ({
    ...manifest,
    dependencies: {
      ...manifest.dependencies,
      ...Object.fromEntries(adapters.map((name) => [mapping.packages[name], 'workspace:*'])),
    },
    scripts: {
      ...manifest.scripts,
      'data:setup': 'node --env-file-if-exists=.env.local scripts/data-setup.ts',
      'data:pin': 'node --env-file-if-exists=.env.local scripts/data-setup.ts pin',
      'data:unpin': 'node --env-file-if-exists=.env.local scripts/data-setup.ts unpin',
    },
  }));
  files.editText('next.config.ts', (code) =>
    code.replace(
      '  reactStrictMode: true,',
      "  reactStrictMode: true,\n  serverExternalPackages: ['wrangler'],"
    )
  );
  files.editJson('tsconfig.json', (config) => ({
    ...config,
    include: [
      ...config.include.filter((entry) => !entry.startsWith('template/')),
      'scripts/data-setup.ts',
    ],
  }));
  return requirements;
}
