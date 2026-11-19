export default {
  type: 'app',
  files: {
    'README.md': 'template/README.md',
    'docs/project-data.md': 'template/docs/project-data.md',
    'docs/feature-modules.md': 'template/docs/feature-modules.md',
    'src/integrations/portfolio/runtime.ts': 'template/host/portfolio-runtime.ts.template',
    'src/integrations/portfolio/worker.ts': 'template/host/portfolio-worker.ts.template',
    'src/integrations/contact/sender.ts': 'template/host/contact-sender.ts.template',
    'scripts/data-setup.ts': 'template/host/data-setup.ts.template',
    'src/site/project-data.ts': 'template/host/project-data.ts.template',
  },
  setup: {
    command: ['data:setup', '--local'],
    outputs: ['.local/portfolio'],
    demo: {
      command: ['data:setup', '--local', '--with-demo'],
      files: {
        'content/default/data/project-files/field-notes.json':
          'template/demo/content/default/data/project-files/field-notes.json',
        'content/default/data/project-files/projects.json':
          'template/demo/content/default/data/project-files/projects.json',
        'content/default/text/en/projects-demo.json':
          'template/demo/content/default/text/en/projects-demo.json',
        'content/default/text/zh/projects-demo.json':
          'template/demo/content/default/text/zh/projects-demo.json',
        'public/samples/portfolio/README.md': 'template/demo/public/samples/portfolio/README.md',
        'public/samples/portfolio/color-index-badge.jpg':
          'template/demo/public/samples/portfolio/color-index-badge.jpg',
        'public/samples/portfolio/color-index.jpg':
          'template/demo/public/samples/portfolio/color-index.jpg',
        'public/samples/portfolio/lake-thumbnail.jpg':
          'template/demo/public/samples/portfolio/lake-thumbnail.jpg',
        'public/samples/portfolio/lake.jpg': 'template/demo/public/samples/portfolio/lake.jpg',
        'public/samples/portfolio/worktable.jpg':
          'template/demo/public/samples/portfolio/worktable.jpg',
        'src/site/project-data.ts': 'template/demo/project-data.ts',
      },
    },
  },
  destination: 'apps/portfolio',
  initialize: 'template/initialize.mjs',
  requires: [],
  packages: ['@frontend/node-storage', '@frontend/cloudflare'],
  app: {
    devPort: 3004,
    testPort: 3104,
  },
};
