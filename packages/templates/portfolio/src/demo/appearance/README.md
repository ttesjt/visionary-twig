# Optional appearance preview

This module demonstrates Neutral and Mono without owning application behavior.
It contains the picker, early script, browser storage/subscriptions and all preview
unit/browser tests. Its only application integration is the root layout's two
explicit mounts. `PortfolioFrame` and `SiteNavigation` accept a generic ReactNode
preference extension; they do not import or inspect this module.

To remove the preview:

1. In `src/app/[locale]/layout.tsx`, remove the `demo/appearance` import,
   `<AppearanceDemoBootstrap />` (and the now-empty head), and the
   `preferenceExtensions={<AppearanceDemoPicker />}` prop from PortfolioFrame.
2. Delete `src/demo/appearance` including its tests.

No infra, Provider, resource plan, storage migration or site configuration changes
are required. The generic browser-test glob simply stops discovering this folder.
Unused appearance labels in the main dictionary may be removed optionally; leaving
them does not create a runtime dependency.

`src/styles/index.ts` explicitly imports the shared Mono tokens and the site's
Mono layout. They apply without JS or an HTML preview attribute. Remove those
optional Mono imports to use the basic site styles, or replace them with your CSS.
Your tokens are unrestricted; bridge to public `--ui-*` names when consuming the
default shared component CSS. There is no required preset registry or Provider.

The preview alone sets `data-style-preview` to compare the imported styles. Its
storage key is not a production website preference. Project fetching, readiness,
component identity, URLs and language resources remain independent of this value.
The real light/dark/system preference remains a separate supported site feature.
