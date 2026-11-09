# Text dictionaries

The templates prepare flat UI dictionaries by locale and namespace. Use
`text-resources.config.ts` to declare locales, namespaces and a reference
language. The tracked reference JSON defines allowed keys and placeholders.

## Files and commands

| Path                                                  | Purpose                                      |
| ----------------------------------------------------- | -------------------------------------------- |
| `content/default/text/<locale>/<namespace>.json`      | Tracked default dictionary                   |
| `.local/content/text/<locale>/<namespace>.json`       | Ignored partial override                     |
| `.generated/text/<locale>/<namespace>.json`           | Prepared dictionary                          |
| `.generated/text/contracts.json` and `resources.json` | Key, variable and resource identity metadata |

Run `pnpm text:prepare --app <id>` after editing inputs and
`pnpm text:check --app <id>` to check freshness. Use `pnpm app:prepare --app <id>`
to prepare Text alongside AppConfig and Content. See
[private inputs](content-profiles.md) for source selection.

## Add a key, parameter or locale

Add new keys to the reference dictionary. A key such as `home.title` is a single
property, and each value is a string. Use placeholders such as `{count}` in the
reference string to declare variables. Translations may reorder, repeat or omit
those placeholders. Add a tracked JSON file for each declared locale and
namespace. A missing translation inherits the effective reference value by
default. For complete tracked translations, set `missingKeys: 'error'`.

## Server and client

Read a prepared namespace through the template reader. A Client Component gets
it from `useText()`. A Server Component can use the host's server reader during
SSR. Both call a synchronous getter.

```ts
text.getText('main', 'home.title');
text.getText('main', 'search.results', { count: 3 });
```

The resource plan loads only the requested namespaces and passes prepared
snapshots into the relevant scopes. See [resource initialization](resource-initialization.md)
for scope composition, SSR handoff and language switching.

## Component text and stored content

New UI APIs use `text`, `*Text` and `*TextSchema`; the full host dictionary is a
TextCatalog. StudioShell, StudioWorkbench,
StudioTextCatalogProvider, StudioJsonEditor and StudioDiscardDialog accept `text`.
Their optional neutral defaults support standalone use. Media defaults live in
package-owned JSON and use public validation schemas. Hosts inject translated
labels through the component UI APIs.

There is no content-protocol migration in this naming convention. These fields
remain accepted and emitted unchanged:

| Owner                     | Stable stored fields                                      | Canonical public text types         |
| ------------------------- | --------------------------------------------------------- | ----------------------------------- |
| content-blocks media      | `copy`, `viewerCopy`                                      | GalleryText, ViewerText             |
| ui-document / Studio data | `context.copy`, `variables.copy` and binding source paths | Existing document/catalog contracts |

Media props share those serialized schemas, so their field names also remain
stable. Components map the fields into internal text values. File copying,
clipboard operations and Puck's API keep their existing names.

## UI source guard and review boundary

Workspace checks discover hosts through `workspaceTextResources: true`. The AST
rule scans source, including examples, and rejects direct JSX
words, inline visible/accessibility labels, text branches and label descriptors
in TSX. It also rejects retired UI identifiers/imports. It has no application-name
allowlist, and is copied into generated projects. Tests and business data remain
outside UI syntax checks; an entire cases/examples directory is never exempt.

Static checks cannot infer whether an arbitrary variable is a label. Review `.ts`
case factories, enum displays, computed text and visible error paths explicitly.
Example variant slugs, API names, source roles and inspected JSON are diagnostic
values; they are shown literally to explain the tested configuration. Authored
sample articles, records, captions and their content links belong in fixtures.
Operation buttons and surrounding headings still belong in TextCatalog.

Use `textOptionLabelsSchema(options)` for exhaustive option labels. It retains
literal ID types. For runtime-selected IDs use `textOptionLabel(labels, id)`;
missing labels throw an integration error rather than displaying an ID fallback.
Use `textTemplateSchema` and `formatText` for counted/parameterized messages,
including examples. Preparation derives the contract revision from the reference
dictionary and the content revision from the prepared strings.
