# Shared package rules

- These packages are reusable across applications. Do not depend on packages/site or apps, including from tests or development dependencies.
- Keep all content neutral. App hosts own personal identity, prose, records, media, storage and framework integration.
- Components expose stable semantic hooks. Component defaults belong to their owning package, with explicit CSS exports from src/styles/. Optional neutral themes belong to the shared styles workspace.
- Change public contracts deliberately and adapt all consumers. Follow the root architecture, package conventions and TypeScript rules.

- Never depend on concrete adapters or provider SDKs, including through tests, devDependencies or a transitive workspace helper. Neutral storage ports live in storage; apps select implementations.
