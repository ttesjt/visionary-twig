# Metadata in the Plain Next starter

The starter uses Next's native `generateMetadata` API and file conventions.
Metadata provides document titles, descriptions, language links and social previews.
It is prepared on the server and can be included in statically generated HTML.
It requires no client Provider, bootstrap script or browser resource request.

## Ownership and source mapping

`src/site/metadata.ts` owns both `metadataDefinition.enabled` and its `load` function.
The default source reads localized labels from Text namespace `main`, non-language
image settings from AppConfig namespace `app`, and an optional deployment origin
from `SITE_URL`. These are starter choices, not reserved framework names.

| Edit                                     | Starter location                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| Enable or disable this workflow          | `metadataDefinition.enabled` in `src/site/metadata.ts`                              |
| Title, description and image description | `metadata.*` keys in `content/default/text/<locale>/main.json`                      |
| Share image path and dimensions          | `metadata.image` in `config/default/app.json`                                       |
| Private local overrides                  | The corresponding ignored `.local` Text/config input                                |
| Deployment origin                        | Optional `SITE_URL` in app-local env or hosting settings                            |
| Rename a namespace or change its shape   | Update the source mapping in `src/site/metadata.ts` with your resource declarations |
| Favicon                                  | Replace `src/app/icon.svg` using Next's file convention                             |

After changing source JSON, run `pnpm app:prepare --app <app-id>`.
Defaults, custom overlays, generated identity validation and server imports use the
existing resource workflow. Runtime never reads default or `.local` source files.
The source's strict Text reader throws for missing keys or an unprepared namespace;
it cannot silently publish a `namespace.key` placeholder. Other readers retain
their existing missing-text policy. Missing translations follow the configured
prepare-time reference-language inheritance policy.

`src/infra/metadata` receives resolved fields and knows no resource namespace,
Text key, config shape or environment variable name. `prepareMetadata(definition,
context)` checks the switch, calls the site's source, validates its returned data
and creates Next `Metadata`. A source error remains an error, with its identity
and cause intact. Do not catch every failure and return an empty object.
The pure `buildMetadata(input)` is available when a caller already owns ready data.
Preparation-safe common URL/image schemas live in `src/infra/metadata-schema.ts`;
they import no generated resources or server runtime.

## Switch and optional fields

`enabled` defaults to `true`. Set it to `false` in the site definition to return
`{}` without calling the source. This skips its Text/config/environment reads.
The site's ordinary UI resources are still independently prepared by Layout.
The switch does not remove Next's default charset/viewport, file-based icons,
or metadata independently declared by another page. It is not a global head filter.
A user can derive a switch from their own settings in the site entry, but infra
never assumes an `enabled` field exists in a particular AppConfig namespace.

- An omitted optional image or origin is valid. Required title and description
  must be nonempty strings.
- A declared malformed URL, image or required label fails validation. Missing
  declared JSON/namespace/key references fail preparation, type checking or building,
  as applicable; request-rendered failures reach the normal error handling.
- Without `SITE_URL`, canonical/hreflang and relative share-image tags are omitted.
  Basic localized titles/descriptions and social text still work. An explicitly
  absolute HTTP(S) CDN image can still be used without a site origin.
- Relative image paths are site-root paths. The starter supplies
  `public/metadata/share.png`; replacing the path requires supplying a real public
  asset or remote resource. Automated tests check the shipped image, not every
  URL a future user might configure.

`SITE_URL` is an HTTP(S) origin such as `https://example.com`, without credentials,
a route, query or fragment. Its name is declared in `src/site/environment.ts`.
Do not derive a public canonical host from an incoming request Host header.
Like other build inputs to statically generated pages, changing it requires a
rebuild. It is public site information, not a secret. Server validation errors
identify the field without printing the configured value.

## Global and page metadata

Root Layout calls `siteMetadata(locale)` for common labels and sharing defaults.
It supplies no page path, so its descendants do not inherit the homepage canonical
or Open Graph URL. The homepage calls `siteMetadata(locale, '/')` explicitly.
An additional page can follow the same pattern:

```tsx
export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ readonly locale: string }>;
}) {
  return siteMetadata(await resourceRouteLocale(params), '/about');
}
```

The starter's site mapping emits `/en/about` and `/zh/about` as public language
versions. Each page uses its own canonical and reciprocal `hreflang` links.
Only declare language variants that actually exist. A site with different public
URLs edits this mapping. Root Layout does not inspect headers for the current
pathname and does not force request rendering.

Localized metadata follows the URL locale used for server rendering. The existing
in-page Text language selector updates its reader state; it does not rerun server
`generateMetadata` or change the URL. If a site wants the address, document head and
reader language to change together, navigate to the corresponding language URL.
This capability does not change that independent locale-navigation policy.

Next merges metadata by route segment. Nested objects such as `openGraph` are
replaced when a child supplies that object; use the site helper to generate a
complete localized set or explicitly merge parent fields with Next's parent
metadata argument. Existing page-level `noindex` policies continue to apply.

See [Next Metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata),
[metadata files](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
and [Google's localized-page guidance](https://developers.google.com/search/docs/specialty/international/localized-versions).
