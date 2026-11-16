export default {
  type: 'app',
  files: { 'README.md': 'template/README.md' },
  destination: 'apps/portfolio',
  initialize: 'template/initialize.mjs',
  requires: [],
  app: {
    devPort: 3004,
    testPort: 3104,
  },
};
