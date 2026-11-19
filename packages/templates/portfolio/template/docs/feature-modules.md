# Pages and feature modules

Use this guide when removing a page, adding a feature, or bringing a feature from
another template into a generated Portfolio app. Paths are relative to the app.
These conventions describe the supplied starter. Your own features can use a
different structure.

## Find the owner

| Location                                         | Responsibility                                                  |
| ------------------------------------------------ | --------------------------------------------------------------- |
| `src/app/`                                       | Next route, metadata and API mounting; simple route-owned UI    |
| `src/features/projects/`                         | Project presentation, URL state, SQL and file-based flows       |
| `src/features/contact/`                          | Contact form, platform links, request validation and submission |
| `src/components/`                                | Site frame, header and preference controls                      |
| `src/site/`                                      | Site routes, configuration, Text and resource composition       |
| `src/integrations/`                              | Concrete storage and email sender creation                      |
| `src/infra/`                                     | Existing resource, theme and other starter mechanisms           |
| `src/styles/projects/`, `src/styles/contact/`    | Appearance owned by each feature                                |
| `content/default/`, `config/default/`, `public/` | Prepared inputs and public assets                               |

`app/[locale]/projects/page.tsx` mounts the SQL list with its concrete data port.
`app/api/projects/` binds that port to the feature's HTTP handlers. Home uses the
same browser component inside its own Selected work section. Removing the
Projects route therefore does not remove the Projects capability from Home.

The file-based example mounts the same presentation with Content readers.
Its readers live under `features/projects/files/`. App-owned input and detail
declarations live in `site/project-data.ts`, and
`site` combines those declarations into the existing preparation and runtime
resource plans. See [project data](project-data.md) for both source choices.

Home and About remain small route-owned compositions. Their local components stay
under `app/[locale]/_components/` and `app/[locale]/about/_components/`.
An entire feature does not need to be used by multiple pages before it belongs in
`features/`. A self-contained workflow is a useful ownership boundary too.

## Public entries

Use these entries from routes, site declarations and host integrations. Inside a
feature, direct imports keep related implementations together. Avoid reaching into
another feature's component, browser or server implementation files.

| Entry                                    | Use                                                        |
| ---------------------------------------- | ---------------------------------------------------------- |
| `features/projects/index.ts`             | Source-independent URL parsing and link state              |
| `features/projects/client.ts`            | Shared project skeleton and detail view                    |
| `features/projects/sql/index.ts`         | SQL endpoints, URLs and data-port types                    |
| `features/projects/sql/client.ts`        | SQL ProjectBrowser                                         |
| `features/projects/sql/server.ts`        | Next server list/detail preparation and HTTP handlers      |
| `features/projects/sql/data.ts`          | Compose domain queries with an injected storage connection |
| `features/projects/import.node.ts`       | CLI composition of prepared inputs and SQL import          |
| `features/projects/files/index.ts`       | File registrations, input paths and resource declarations  |
| `features/projects/files/client.ts`      | Content list and detail components                         |
| `features/projects/files/server.ts`      | File catalog and detail SSR snapshots                      |
| `features/projects/files/preparation.ts` | Prepare-time Puck and Text-reference validation            |
| `features/contact/index.ts`              | Contact endpoint                                           |
| `features/contact/client.ts`             | ContactContent                                             |
| `features/contact/server.ts`             | Request handler accepting a host-provided email sender     |

Client and server entries are separate. In particular, storage factories use
`sql/data.ts`, which does not import the Next page preparation or its components.
Keep `server-only` code outside client import graphs.

These application features compose the starter's existing APIs; this directory
organization does not introduce a plugin runtime. Existing workspace checks still
cover package/layer rules and declared infrastructure scopes. Folder names do not
automatically register additional `workspaceFeatures` boundaries; public feature
entry usage and application composition also require code review.

## Remove a page or a capability

To remove a page, delete its route directory, remove its navigation entry in
`site/routes.ts`, and update links that pointed to it. If `hiddenNavigation` lists
the deleted entry, remove that value from AppConfig too. Keep shared functionality
that another page still consumes.

To remove an entire capability, also remove its feature, service wiring, resources,
styles, tests and unused dependencies. Resolve the host's remaining references
before deleting shared packages.

| Capability | Mounts and other consumers to inspect                                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| About      | `app/[locale]/about/`, navigation, About rules in `styles/site.css` and `styles/mono.css`                                                           |
| Contact    | `app/[locale]/contact/`, `app/api/contact/`, `features/contact/`, `integrations/contact/`, `styles/contact/`; Home's contact links and footer       |
| Projects   | SQL and file-example routes, `app/api/projects/`, `features/projects/`, `integrations/portfolio/`, `styles/projects/`; Home's Selected work section |

Feature CSS is explicitly loaded by `styles/index.ts`. Remove its imports when
removing that feature; also inspect the shared package CSS imports. Site-wide
preset tokens remain in `styles/mono.css`, so moving a feature's CSS does not move
the site's theme policy.

Projects and Contact use fields in the single AppConfig and labels in the main
Text catalog. Remove unused fields and labels as part of final cleanup. Text need
not be split into a separate JSON per feature. Retain `default/custom/generated`;
archive private overrides separately rather than deleting them with a demo.

For removing only one project data source, follow the narrower, tested steps in
[project data](project-data.md).

## Add a page

For a small page, create `app/[locale]/<route>/page.tsx` and any private
`_components/` beside it. Use the existing locale, metadata, Text and resource APIs.
Add a navigation declaration and `navigation.<id>` labels if it should appear in
the header.

For a workflow such as Chat, put its presentation, state, validation and request
logic in `features/chat/`, exposing deliberate pure, client and server entries as
needed. Its route mounts those entries. A host integration creates concrete service
clients and injects the ports the feature needs. Create only the files and folders
that the workflow actually requires.

Declare required resources through `site` and the preparation configurations.
Reuse Layout resources where available; add page preparation only for additional
resources. Loading a new namespace does not by itself require another Provider.
Use a local Provider when independent resource ownership is needed, or for the
existing Next SSR snapshot handoff of separately prepared page resources.

## Bring a feature from another template

1. Check that the source and target expose compatible base resource APIs.
2. Copy the feature directory and the desired page/API mounts. Choose destination
   URLs and update their declarations instead of copying the source's whole Layout.
3. Copy the matching `styles/<feature>/` directory and required public assets.
   Add explicit style imports. The target retains ownership of its theme tokens.
4. Add the feature's declared site packages and concrete adapters to the target
   workspace. Reuse existing package implementations; do not overwrite them.
5. Merge the feature's AppConfig schema/default fields, Text keys in each supported
   language, Content inputs and resource registrations into the target's own
   declarations. Check namespace/key collisions. Do not replace the target's
   complete `site` directory or its main dictionaries.
6. Configure the host's service factory, environment and required SQL migrations.
   Bring the feature tests, adapt host-specific fixtures, then prepare, validate
   and run the production browser flow.

For this starter, Projects uses the Portfolio domain package and Puck renderer;
its SQL host uses Node storage or Cloudflare D1/R2. Contact uses the Contact and
Email contracts, plus the selected local outbox or Cloudflare email sender.
Both consume the shared UI/styles. Their package manifests and integration imports
are the authoritative dependency lists.

Copy source inputs, not `.generated`, `.local`, connection secrets or source
runtime data. No change to `infra` should be needed when the target already
provides the compatible starter APIs.
