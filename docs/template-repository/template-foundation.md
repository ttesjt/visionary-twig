# Maintained template foundations

This policy applies to this source repository's Next templates, not applications
generated from them. Plain Next is the canonical framework foundation. Node
library templates have their own engineering contract and are excluded.

## Ownership

| Location                             | Responsibility                                                                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Shared packages                      | Portable mechanics with explicit pure/client/runtime entries. No host registries, Next imports or application instances.         |
| src/infra                            | Framework and generated-resource adapters. Every maintained Next template has exactly the same files, bytes and executable bits. |
| src/site                             | Editable schemas, resource scopes, locale/theme declarations, metadata mappings, policy and thin host composition.               |
| Features, workspace and integrations | Feature rules, UI, workflows and concrete service composition appropriate to the host.                                           |

Site is not restricted to literals or JSON. `readSiteAppConfig`, metadata source
mapping, adapter selection factories and permission callbacks are useful stable
customization entries. Keep their actual storage protocols, resource lifecycle
algorithms and complete feature workflows with the owning capability. Do not
create forwarding files for every small function. Additional domain declaration
files are valid and do not imply a second infrastructure system.

## Upgrade workflow

1. Put genuinely portable changes in the owning shared package; retain Next and
   generated-manifest wiring in infra.
2. Upgrade Plain Next and synchronize every maintained Next template's infra.
   Read host differences through the same site entry contracts. An infra upgrade
   must not introduce a template-name branch or string replacement exception.
3. Keep resource JSON/default/custom/generated, SSR snapshots, browser fallback,
   languages, permissions and existing host behavior intact.
4. Run `pnpm check:templates`, package tests, `pnpm validate`, affected production
   browsers and independently renamed template clone/prepare/build acceptance.

`check:templates` discovers maintained Next entries from the source catalog. It
compares the full infra file set, file bytes and executable bits, rejects links,
and requires the common production site entry files declared by Plain Next. Site
field values and function bodies are not compared. TypeScript verifies consumer
contracts; semantic review still determines whether site contains a thin
composition or a misplaced system. No line-count or blanket function ban proves
that boundary.

The check participates in source `pnpm validate`. Its CLI, implementation, tests
and root command are excluded from generated projects. The portable validation
runner invokes it only when the owning root manifest explicitly declares the
command. Independent projects keep ordinary type/lint/dependency tests and may
add, remove or edit infra files without a template equality check.

## Current common capabilities

- `@frontend/resource-runtime/json`: prepared JSON plan/container restoration.
- `@frontend/text-catalog/resource/content`: explicit Content Text reference
  validation and resolution against an immutable JSON reader.
- Infra adapts generated registries, provides server Text/Config/Content readers,
  scopes, Providers and Guardians, and keeps 404 transport names neutral.

Static appearance is chosen through explicit CSS imports. A stylesheet preset
is a delivery key, not a runtime requirement: importing Mono works without any
Provider, JS, storage or root preset attribute. Hosts may use their own CSS/tokens;
shared defaults consume public `--ui-*` tokens only when those defaults are selected.

## Optional preview isolation

Appearance switching, its early script, storage, subscriptions, picker and tests
belong together in `src/demo/appearance`. The root layout may explicitly mount the
module's public components. Shell components expose ordinary ReactNode slots;
resources, requests, readiness and business component mounting never read preview
state. Semantic component hooks must not encode preset identities. Color-scheme
light/dark/system support remains independent.

The CSS entries expose an optional preview selector for the demo, but absence of
that selector enables the statically imported Mono stylesheet. Removing the root
layout's demo import/mounts and deleting the demo folder leaves a complete site.
The canonical browser configuration discovers spec/test files within any
`test/e2e` folder inside each app, retaining Playwright's JS/TS module and JSX
extensions. This includes feature-owned suites in generated hosts. Removing the
preview folder therefore requires no test configuration change. No infra or site preset entry exists.

The source policy rejects known preview runtime references outside this owner,
and demo imports outside the root layout's public entry. These targeted checks
complement behavior tests; they do not prove arbitrary aliased code is unrelated
to preview state. Generated projects receive none of these maintainer constraints.

## Guidance delivered to users

Generated projects are independent. Keeping recognizable infra boundaries and
stable site entries can make future updates easier to adopt. Users may customize
either layer. Site is specifically intended for website customization; upstream
updates should offer focused migrations and preserve user configuration rather
than replace the directory wholesale. Only our maintained templates face the
stricter consistency policy.
