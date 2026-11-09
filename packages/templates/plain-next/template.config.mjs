export default {
  type: 'app',
  files: { 'README.md': 'template/README.md' },
  destination: 'apps/plain',
  initialize: 'template/initialize.mjs',
  requires: [],
  app: {
    devPort: 3003,
    testPort: 3103,
  },
};
