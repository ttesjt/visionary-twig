# Default resources and private local inputs

Each template owns neutral default Text, AppConfig and Content resources. Its
schema and preparation declarations define the input paths. Users customize the
corresponding files under ignored `.local/`; preparation writes ignored
`.generated/` artifacts. Neither directory is copied into generated projects.

See [resource initialization](resource-initialization.md), [Text](text-catalog.md),
[AppConfig](app-config.md) and the selected template README for the exact contracts.

For the namespace starters, partial custom inputs normally live at:

- `.local/content/text/<locale>/<namespace>.json` for flat UI dictionaries.
- `.local/config/app.json` for the default application settings namespace.
- `.local/content/data/base.json` for the default content namespace.

The actual resource declarations may choose different paths. `auto` preparation
merges optional overrides; `default` does not read custom files; explicit `custom`
requires every declared file. Invalid custom input fails without silent fallback.
Preparation never overwrites `.local`, imports business data, selects a storage
provider or uploads media. Secrets remain server-owned and do not belong in public
configuration or text dictionaries.

Persisted document paths such as `context.copy` and `viewerCopy` follow their
content schemas. Text dictionary preparation operates on UI strings.

SQL/object storage is independently injected into its consumer. See
[data source ownership](../template-repository/data-sources.md) and the selected adapter documentation.
