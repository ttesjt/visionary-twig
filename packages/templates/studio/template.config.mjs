export default {
  type: 'app',
  files: { 'README.md': 'template/README.md' },
  destination: 'apps/studio',
  initialize: 'template/initialize.mjs',
  requires: [],
  app: {
    devPort: 3001,
    testPort: 3121,
  },
  primary: false,
};
