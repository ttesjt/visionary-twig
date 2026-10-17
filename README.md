# Frontend Workspace Template

A pnpm-only workspace with strict shared tooling, private scoped ESM packages, explicit public exports, and package-policy checks. Root owns orchestration, apps/ contains runnable hosts, and packages/ contains reusable capabilities.

## Setup

Use Node 24.15.0 or a newer Node 24 patch and pnpm 10.28.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm validate
```

Validation checks package policies, builds public exports, and runs format/lint/type/test checks. The reference Node library demonstrates source tests and built-package consumption. Source checks run before builds so omitted scripts cannot silently bypass validation.

No application framework is installed. Add a runnable host under apps/ when choosing a framework. Root dev watches library outputs.

See [architecture](docs/architecture.md), [package conventions](docs/package-conventions.md), and [copying the template](docs/using-template.md).
