# @frontend/text-catalog

- The root entry provides locale validation, `formatText`, `textTemplateSchema`
  and option-label helpers for standalone UI components.
- `/resource` validates flat dictionaries and creates synchronous, language-bound
  readers.
- `/resource/node` provides preparation definitions for Node tooling.
- `/resource/react` provides a typed Context factory for publishing a reader.

The host declares locales, namespaces, and tracked dictionaries. See
[Text](../../../docs/common/text-catalog.md) and
[resource initialization](../../../docs/common/resource-initialization.md) for
host setup and executable examples.

## Flat namespace resources

`@frontend/text-catalog/resource` provides synchronous TextResource storage and
immutable language-bound views, without I/O or React.

Each namespace dictionary is flat: every value is a nonempty string. A key such
as `home.title` is an ordinary literal property, not a nested path. Objects, arrays,
unsafe JSON keys and expression/HTML evaluation are rejected.

The tracked reference-language default JSON is the only authored key/variable
contract. `/resource/node` derives it; do not maintain a Zod schema, key list or
variable whitelist per namespace. Every prepared locale has the same keys.
Translations and custom values may reorder, repeat or omit default placeholders,
but cannot introduce an undeclared variable. Partial overrides inherit defaults.

```ts
import contracts from './.generated/text/contracts.json';
import { TextResource } from '@frontend/text-catalog/resource';
const resource = new TextResource(contracts.namespaces, [
  {
    locale: 'en',
    dictionaries: [{ namespace: 'main', dictionary, version: resourceVersion }],
  },
]);
const text = resource.createView('en', { required: { main: resourceVersion } });
text.getText('main', 'home.title');
```

Install every namespace needed before consuming it. The example key names belong
to the host's defaults, not this package. Generated contract object properties
preserve namespace/key/variable types without importing dictionary text into JS.
The generic runtime accepts contracts through its constructor; it knows no app paths.

`getText(namespace, key, values?, {locale}?)` always returns a string synchronously.
Without values (including explicit undefined), it returns the raw template and
does not call the formatter. With values, it substitutes only `{identifier}` slots.
Templates compile once during installation. Empty objects explicitly request
interpolation; missing values raise TextInterpolationError. Values support finite
numbers and strings, including 0/empty strings. Unknown variable names, accessors
and invalid types reject. Already-declared variables omitted by a translation may
be supplied and remain unused. Inserted values are never parsed again.

TextInterpolationError exposes kind, namespace, key, locale and optional variable
name, never the supplied value. Runtime missing text returns namespace.key and
calls optional onMissing. Missing required resources remain a host loader error;
getter diagnostics do not substitute for initialization.

TextResource validates all constructor inputs before returning a prepared container.
It owns its dictionaries and contract metadata. Unknown/duplicate namespaces, invalid
locale/version/dictionary/variables and exhausted locale capacity reject. maxLocales
defaults to the named capacity of 32. Empty input does not satisfy required resources.
hasText checks only local namespace/locale/version, with no parent lookup or I/O.

createView(locale, { required, parent }) checks local requirements and returns an
immutable reader. Language is explicit. No addText, removeText, clear,
setCurrentLang or direct resource getter remains. New prepared data uses a new
TextResource; UI publication belongs to the host. Explicit locale overrides on a
reader can only read dictionaries already prepared in that scope.

The /resource/react entry supplies createTextResourceContext<C>(), TextProvider
and useText as optional thin Context utilities. It owns no fetching, readiness or
subscription. Hosts may use another UI/state system with the same pure readers.

## Preparation and generated contracts

```ts
import type { TextResourceConfiguration } from '@frontend/text-catalog/resource/node';
export default {
  version: 1,
  contentVersion: 'v1',
  referenceLocale: 'en',
  missingKeys: 'inherit-reference',
  locales: ['en', 'zh'],
  namespaces: ['main', 'demo'],
} satisfies TextResourceConfiguration;
```

This configuration must run before generated files exist: never import runtime
registry/contract types through its dependency chain. Use textResourcesDefinition
in the existing prepared-data workflow. Defaults are
content/default/text/<locale>/<namespace>.json; ignored partial overrides are
.local/content/text/<locale>/<namespace>.json. Auto/default/custom behavior, locks,
rollback and freshness use the same infrastructure as AppConfig.

For namespace Text, `referenceLocale` defaults to `en` and must be one of the
declared locales. Its tracked files define the keys and allowed variables.
With the default `missingKeys: 'inherit-reference'`, each final key comes from
the target locale's selected custom override, its tracked translation, or the
effective reference dictionary, in that order. The reference dictionary includes
its own custom overrides only when the selected source mode uses them.

Keep a tracked JSON file for every declared locale and namespace. Use `{}` to
inherit a whole namespace. With `missingKeys: 'error'`, every tracked translation
must include every reference key before any custom override is applied. Both
policies reject unknown keys, empty strings and invalid placeholders.
`text:prepare` and `app:prepare` print inherited keys grouped by locale and namespace
after a successful commit. A translated value identical to its reference still
counts as translated. Generated dictionaries are complete for SSR and browsers.

All tracked defaults validate before custom applies. Changing custom text never
redefines allowed keys or variables. Failed validation leaves all previous output
intact and never rewrites local inputs. One atomic output directory contains:

- catalog.json: canonical preparation record for the namespace workflow.
- contracts.json: protocol version, reference locale and namespace key/variable maps.
- <locale>/<namespace>.json: the final independently readable flat dictionaries.
- resources.json: content and contract revisions, protocol and resource identities.
- manifest.json: source/input/output hashes, including optional absence and inventory.

Resource manifest protocol is 2; the flat contract protocol is 1. Key/variable
changes update the automatic contract revision; final text changes update content
revision. Hosts include both in resource/snapshot identity. `parseTextNamespace`
validates HTTP/SSR dictionaries against the generated namespace contract before
initialization publishes content. ownTextContracts validates and freezes metadata
without widening its generated property names. TextContractsInput is the
schema-derived raw JSON shape (whose markers may be widened booleans); validated
TextContracts only admits true markers. ownTextContracts returns OwnedTextContracts
with every namespace/key/variable level readonly and does not freeze the caller
input. Runtime validation rejects false markers before installation.

The generator/host checks missing, modified, stale and extra outputs. HTTP exposes
only registered dictionary files, never contracts, manifests, configs or local
sources. Dictionary payloads stay outside client JS; key/identity metadata may be
bundled. See [resource initialization](../../../docs/common/resource-initialization.md)
and plain-next for SSR snapshots, CSR gating, language switching and deployment.

## Independent scopes and inherited readers

Construct a page resource with only its prepared dictionaries:

```ts
const pageResource = new TextResource(contracts.namespaces, [
  {
    locale: 'en',
    dictionaries: [{ namespace: 'demo', dictionary: demoDictionary, version: resourceVersion }],
  },
]);
const pageText = pageResource.createView('en', {
  required: { demo: resourceVersion },
  parent: text,
});
pageText.getText('main', 'home.title');
pageText.getText('demo', 'greeting', { name: 'Reader' });
```

Each resource owns its actual local dictionaries before first render.
composeTextViews(parent, local), also used by createView, shares immutable entries
and captured reader references. Parent/local languages must match and namespace
collisions reject. Parent requirements cannot substitute for local required versions.
A new parent means a new composition; old readers remain unchanged. There is no
global mutable owner, cross-scope write, subscription or post-mount registration.

The class centralizes validation and interpolation for server, non-React and
alternative state-management consumers. React hosts publish complete reader values
through Context. Users may replace this practical default integration to suit their
scale without replacing the pure text contracts.

## Prepared server imports

Namespace Text preparation derives server-imports.ts from the same manifest that declares languages and namespaces. Hosts bind those files to their resource URL definitions in a server-only entry. Adding a namespace or language updates literal imports during text:prepare, with the same atomic replacement and freshness checks.

Flat namespace dictionaries accept empty strings for optional display text. Keys remain nonempty and every value must be a string. Applications validate required display text and relationships to configuration during preparation.

A namespace can declare an alternative default directory through
`defaultDirectories: { demo: 'template/demo/text' }` in its Text resource
configuration. The preparer reads `<directory>/<locale>/<namespace>.json`.
Undeclared namespaces and paths outside the app are rejected. Namespaces without
an override use `content/default/text`. Custom inputs keep their ordinary
`.local/content/text/<locale>/<namespace>.json` paths, including contract
validation, fallback and freshness checks. This supports source-only template
dictionaries while generated applications use ordinary authored defaults.

## Text references in Content

The pure `@frontend/text-catalog/resource/content` entry defines explicit
`{ $text: { namespace, key } }` references. `validateContentTextReferences`
can be used as a Zod superRefine callback to check nested references during
preparation without resolving them. `createContentReader(raw)` adds
`getResolved(namespace, { text })` to a prepared JSON reader, including inherited
namespaces. It resolves with the supplied synchronous Text reader and leaves
raw snapshots unchanged. Literal strings remain literal. Malformed markers and
lookup errors are surfaced; resolved arrays and objects remain immutable.

These APIs work on Node and browsers without React, Next or an application
registry. The host owns its content schemas, source preparation and resource plan.
