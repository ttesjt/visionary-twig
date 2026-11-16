export default {
  type: 'app',
  files: {
    'README.md': 'template/README.md',
    'src/site/project-data.ts': 'template/host/project-data.ts.template',
  },
  destination: 'apps/portfolio',
  initialize: 'template/initialize.mjs',
  requires: [],
  app: { devPort: 3004, testPort: 3104 },
};
