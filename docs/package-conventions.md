# Package conventions

Each workspace is a private ESM package in the root scope and declares workspaceKind. node-library requires build, clean, dev, typecheck, lint, lint:fix, test, test:watch, test:coverage, format, and format:check. It also requires README.md, src/index.ts, tsconfig.json, tsconfig.build.json, and vitest.config.ts.

Use packages/template as the reference. Tests live beside source or under test/. Build configs exclude test/spec files. Root commands build dist before public-export integration tests. Use catalog: for aligned dependencies and workspace:* internally. Runtime source cannot depend on devDependencies alone.

Run check:workspace:source without build outputs and check:workspace after building. validate runs the complete available baseline. Add another workspaceKind with tests when introducing a concrete new host type.
