# @frontend/ui

Framework-independent React structure, accessibility, and interaction with stable ui-* hooks and bounded variants. Components reject inline styles. The package does not import Next.js, application state, transports, or CSS.

Import `@frontend/ui/default.css` at the host entry for the default geometry,
control layout, and responsive rules. Select `@frontend/styles/default.css` for
the optional neutral theme and appearance. Host styles can override documented
`ui-*` hooks or layout tokens such as `--ui-layout-space-content`,
`--ui-layout-gutter`, and `--ui-layout-content-width`.

Layout components remain server-compatible. Interactive client entry points
preserve their own use-client directives in emitted output.

This workspaceKind=react-library package follows the shared script/configuration conventions. It declares React peers, emits ESM/declarations/maps to dist, and runs component tests in jsdom. Browser layout behavior is checked through the application and independent CSS fixtures.

## Layout API

Import from `@frontend/ui/layout` (also available from the server-safe root).
Every layout supports children, native ARIA/DOM attributes, native refs and an
optional consumer `className`. `style` is rejected by types and removed at runtime.

| Component | Parameters and defaults                                                                                                                 | Public hooks                                                                        |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Container | `width: reading/content/full` (content), `as: div/section/article` (div)                                                                | `.ui-container`, `data-width`                                                       |
| Column    | `space: none/content/section` (content), `align: start/center/end/stretch` (stretch)                                                    | `.ui-column`, `data-space`, `data-align`                                            |
| Row       | same space/align (center), `collapse: narrow/never` (narrow), `justify: start/center/end/between` (start), `wrap: nowrap/wrap` (nowrap) | `.ui-row`, `data-space`, `data-align`, `data-collapse`, `data-justify`, `data-wrap` |
| Grid      | same space, `columns: 1/2/3/4` (1), `collapse: narrow/never` (narrow)                                                                   | `.ui-grid`, `data-space`, `data-columns`, `data-collapse`                           |
| Layer     | `overlay?: ReactNode`, `position: fill/center/top-start/top-end/bottom-start/bottom-end` (top-end)                                      | `.ui-layer`, `.ui-layer-content`, `.ui-layer-overlay`, overlay `data-position`      |

`narrow` switches at viewport widths up to 40rem: Row becomes a stretched column,
Grid becomes one column. DOM order stays unchanged. `never` preserves the declared
structure; it does not guarantee a useful minimum column width for every payload.
Layer children stay in document flow; overlay follows them in reading order and
uses a local stacking context. Overlay content must fit its main content area.
Layer does not provide modal interaction. No arbitrary CSS template or polymorphic
element API is exposed. Option lists, their derived types, and shared `DEFAULT_SPACE`/`DEFAULT_COLLAPSE` defaults are public exports.

Container widths include padding. Reading and content default to `44rem` and
`68rem`; the outer gutter defaults to `1rem`. Nested containers keep their own
maximum width and reuse the ancestor's gutter. A full-width host can set
`--ui-layout-page-inset` on its canvas to reserve extra space on both edges.
`--ui-layout-layer-overlay` controls local overlay stacking.

`--ui-layout-control-height` sets the default Button minimum height of
`2.75rem`. Dialog uses the reading width and gutter tokens, scrolls internally,
and locks root overflow while its native modal is open. The default CSS also
provides the `.ui-visually-hidden` utility and the shared `.ui-page-status`
layout used by template error pages.

## Button

The root exports `Button` with native button props/ref and `pending?: boolean`.
It defaults to `type="button"`. Pending disables activation and sets
`aria-busy="true"` and `data-pending="true"`; explicit disabled also blocks
activation. `.ui-button` and `data-pending` are public styling hooks. Navigation
uses an anchor in the consumer. Button has no client directive or local state;
attach callbacks from a client consumer when needed.

## Dialog (client entry)

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@frontend/ui';
import { Dialog } from '@frontend/ui/dialog';

export function Preview() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Preview</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Preview" description="Preview details">
        <p>Content</p>
      </Dialog>
    </>
  );
}
```

`open`, `onOpenChange` and a nonempty, meaningful string `title` are required. Empty titles and close labels are rejected. The title is
rendered as an h2 and linked with `aria-labelledby`. Optional `description` is
rendered as a paragraph and linked with `aria-describedby`; pass phrasing content.
`children`, native dialog attributes/ref, `className`, `closeLabel` (default
"Close dialog", localize in the consumer) and `initialFocusRef` are supported.
Keep that ref stable; its target must be a focusable descendant. Without it the
browser chooses the initial focus (normally the provided close button). The title
can be visually hidden with a consumer stylesheet while retaining its DOM label.

The entry and emitted entry preserve `use client`; Dialog is intentionally absent
from the root/layout exports. It uses native `showModal()` in an effect, leaving
server HTML closed until hydration. Native top-layer behavior provides background
inertness and keyboard focus containment. Esc and the provided close button request
`onOpenChange(false)`; the parent must update `open`. Prop-driven closes do not
emit redundant requests. Native form/imperative closes also notify the parent.
Pass React callbacks from a client owner, not across the RSC serialization boundary.
On close/unmount the original connected focus target is restored. The component
stays mounted while closed; children retain state. Outside clicks do not dismiss.

Structural CSS locks root scrolling while any `.ui-dialog:modal` exists, including
nested dialogs. It requires modern native dialog, `:has()` and dynamic viewport
unit support; there is no legacy polyfill or custom focus trap. Modal content
scrolls internally when taller than the viewport. Native behavior reference:
[HTML dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).

Public hooks: `.ui-dialog`, `.ui-dialog-header`, `.ui-dialog-title`,
`.ui-dialog-close`, `.ui-dialog-description`, `.ui-dialog-body`, and
`.ui-dialog::backdrop`. Keep the required structure for title and close behavior;
private descendants outside this list are not a styling contract.

| Interactive capability | Public hooks and states                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Button                 | `.ui-button`, `[data-pending='true']`, native `:disabled`, `:hover`, `:active`, `:focus-visible`         |
| Dialog frame           | `.ui-dialog`, native `[open]` and `:modal`, `.ui-dialog::backdrop`                                       |
| Dialog content         | `.ui-dialog-header`, `.ui-dialog-title`, `.ui-dialog-close`, `.ui-dialog-description`, `.ui-dialog-body` |

The generated title/description IDs are associations, not stable customization hooks.
Only JavaScript/JSX consumers may supply ordinary className hooks; future document
JSON adapters must enforce their own finite schema and must not forward arbitrary
className, style or CSS through these generic DOM props.

## Theme preference contract

`@frontend/ui/theme` exports THEME_PREFERENCES, ThemePreference,
DEFAULT_THEME_PREFERENCE and parseThemePreference. It is pure/server-safe and
contains no cookie or DOM behavior. Hosts own persistence, root data-theme and
controlled inputs. `@frontend/ui/README.md` is a public read-only documentation resource.

## Host theme policy

ThemePolicy supports `{ mode: 'fixed', scheme: 'light' }`, fixed dark, or
`{ mode: 'selectable', defaultPreference: 'system' }`. DEFAULT_THEME_POLICY keeps
the existing selectable/system behavior. resolveThemePreference ignores requested
preferences for fixed policies; selectable policies validate preferences before
using their host default. themePolicyFromPreset strictly accepts undefined,
selectable, light or dark; malformed configuration throws. COLOR_SCHEMES and
THEME_POLICY_PRESETS derive from the same preference definitions.

These pure exports read no DOM, cookies, environment or React context. Hosts own
configuration, initial data-theme, controls and persistence. Fixed hosts set an
explicit root attribute and omit theme controls. Hiding controls alone or omitting
data-theme does not disable automatic system colors. No Provider is required; CSS
continues to own palettes and color-scheme.

Dialog accepts optional closeIcon (ReactNode). The closeLabel remains the accessible
name and tooltip; providing an icon adds the ui-icon-button hook. Without an icon,
the existing labeled close button remains unchanged. Icon library and CSS choice
belong to the caller/host.

## ThemeSwitcher (client entry)

Import `ThemeSwitcher`, `ThemeSwitcherProps`, and `THEME_SWITCHER_DIRECTIONS` from
`@frontend/ui/theme-switcher`. The root/layout entries and pure `ui/theme` contract
remain server-compatible.

```tsx
<ThemeSwitcher
  preference={preference}
  onPreferenceChange={setPreference}
  direction="down"
  labels={{ label: 'Theme', light: 'Light', dark: 'Dark', system: 'System' }}
/>
```

The controlled `preference` is light/dark/system. Its icon is the trigger; opening
reveals exactly the other two choices, with equal-size icon targets. `direction`
is down (default), up, left or right; left/right are physical directions, including
in RTL documents. Hosts choose an expansion direction with enough available space.
`icons` replaces any preference icon with a React node; `labels`, `className`,
and centralized CSS customize the control. No storage, root-attribute changes,
framework routing, or Provider is built in. The host applies and persists choices.
An optional ThemePolicy defaults to selectable/system; fixed policies omit the UI.

The trigger exposes its current preference and expanded state. The choice group
supports normal Tab navigation, directional arrow keys, Home/End and Escape.
Selection returns focus to the trigger; outside pointer/focus movement dismisses
without trapping focus. Closed choices are inert and hidden from accessibility.
The trigger is disabled in server HTML until hydration, so a no-JS host retains
its server-selected theme without presenting an active but ineffective button.

Public hooks: `ui-theme-switcher`, `ui-theme-switcher-button`,
`ui-theme-switcher-trigger`, `ui-theme-switcher-options`, `ui-theme-switcher-symbol`,
and `data-direction`, `data-open`, `data-preference`. Shared default layout supplies
geometry; optional shared visuals supply neutral circles, smooth opacity/transform
transitions and icon entrance. Reduced-motion preferences remove animation.
Override `--ui-theme-switcher-size`, `--ui-theme-switcher-gap`,
`--ui-theme-switcher-duration`, `--ui-theme-switcher-easing` and
`--ui-theme-switcher-shift` on the control's global class for customization.

## Web Shell

A React page frame with optional header, footer, sidebar and navigation components.
The host supplies routes, labels, branding and page content. Take the components
you need and compose them in the application's layout.

### Start with the frame

```tsx
import type { ReactNode } from 'react';
import { SiteFooter, SiteFrame } from '@frontend/ui/web-shell';
import { SiteHeader } from '@frontend/ui/web-shell/header';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <SiteFrame
      skipLabel="Skip to content"
      header={
        <SiteHeader
          brand={{ href: '/', label: 'Example' }}
          items={[{ id: 'docs', href: '/docs', label: 'Docs' }]}
          labels={{ navigation: 'Main', openMenu: 'Menu', closeMenu: 'Close', menuTitle: 'Pages' }}
        />
      }
      footer={<SiteFooter brand="Example" linksLabel="Footer" links={[]} />}
    >
      {children}
    </SiteFrame>
  );
}
```

`SiteFrame` provides a single `main` and a focusable skip destination (`mainId`
defaults to `main-content`). The header and footer slots accept any React node,
so a host can supply its own components or omit either slot. Use
`contentLayout="contained"` (the default) with a Container `width`, or
`contentLayout="full"` for direct children of `main`.

The `@frontend/ui/web-shell` entry is server-safe and includes `SiteFrame`, `SiteNavigation`,
`SiteSidebar`, `SiteFooter` and `PageStatus`. Import the interactive `SiteHeader`
from `@frontend/ui/web-shell/header`. These components work with native anchors.
To use a framework link component with the interactive header, pass the adapter
from a client wrapper.

### Style and position the header

Import the default layout and appearance in the host, or use your own stylesheet.

```ts
import '@frontend/ui/default.css';
import '@frontend/styles/default.css';
import '@frontend/ui/web-shell.css';
import '@frontend/styles/web-shell.css';
```

Header defaults to `position="flow"` and scrolls with the page. Use
`position="sticky"` to keep it visible. The layout stylesheet applies sticky
positioning to `data-position="sticky"`, with `--ui-site-header-offset`
(default `0px`) and `--ui-site-layer-header` (default `1`) as CSS overrides.

Frame and Header accept `className`. The supplied CSS uses low-specificity
`ui-site-*` classes and shared layout/theme tokens. Common hooks include
`ui-site-frame`, `ui-site-main`, `ui-site-header`, `ui-site-header-content`,
`ui-site-menu`, `ui-site-navigation`, `ui-site-sidebar` and `ui-site-footer`.
Use the host layout to place the sidebar.

### Navigation and accessibility

- Give each navigation item an `id`, `href` and `label`. Set `currentId` for
  `aria-current="page"`. The host can pass an icon or decorative marker for
  `display="icon"` or `display="featured"`. Compact navigation uses accessible
  names for icon-only links. Full navigation includes visible labels.
- Header accepts a text brand, image brand or both. The image accepts
  `{ url, width, height }` and takes its accessible name from the enclosing link.
  CSS controls logo size through `--ui-site-brand-image-height`,
  `--ui-site-brand-image-width` and `--ui-site-brand-gap`.
- Header accepts optional `actions={{ label, items }}` and controls as children.
  Its mobile menu includes all destinations by default. Pass `menuItems` when
  the mobile list should differ. Server-rendered links remain available until
  the interactive menu is ready. Closing the modal restores focus.
- Sidebar accepts the same navigation data. Its brand, subtitle and footer are
  optional. `SiteFooter` takes a brand, navigation label and links.
- `PageStatus` displays loading, empty or error content with a host-supplied title
  and optional action. Loading uses `role="status"`. The host owns error details,
  HTTP status and retry behavior.

### Optional header extension

Use `@frontend/ui/web-shell/header-extension` for contextual controls supplied by
a page. Wrap the header and contributors with `HeaderExtensionProvider` and set
`scope` to the current route or resource identity.

```tsx
<HeaderExtensionProvider scope={routeId}>
  <SiteHeader {...headerProps} extensionPresentation="integrated" />
  <HeaderExtension resourceKey={resourceId} visible={showActions}>
    <ResourceActions />
  </HeaderExtension>
</HeaderExtensionProvider>
```

The active contribution owns the slot. Changing the scope clears it. A contributor
that starts representing a different resource must change its `resourceKey`.
A replacement does not restore the previous contribution when it unmounts.
With `useHeaderExtension`, capture the returned lease before async work.
`lease.signal` aborts when ownership ends and `lease.update()` returns false
after replacement or release.

`extensionPresentation` is `integrated` (default) or `attached`. Contributions
can select `density="compact" | "comfortable" | "flush"` and an unpadded
`bottom` slot. `HeaderExtensionPopover` supplies a native top-layer menu for
controls inside the extension. Set `width="trigger"` to request trigger-width
positioning. The shared shell styles import the extension styles. Motion is
controlled by CSS and respects reduced-motion settings.

### Verification

```sh
pnpm build:packages
pnpm --filter @frontend/ui test web-shell
pnpm --filter @frontend/ui exec playwright test --config test/e2e/playwright.config.ts
```
