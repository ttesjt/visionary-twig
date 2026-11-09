# @frontend/styles

Optional global visual tokens, base rules, control appearance, and light/dark/system themes. Application entries choose default.css; reusable components never import it.

```ts
import '@frontend/styles/default.css';
```

Select component layout separately through the owning package CSS entries, including `@frontend/ui/default.css` for the UI foundation. Override --ui-* visual tokens or documented ui-* hooks to customize appearance. data-theme="light|dark|system" selects theme rules; applications own preference state and persistence.

Default colors are achromatic in both themes: white/light-gray surfaces with dark text, and charcoal surfaces with light text. The accent is neutral black/white rather than a brand color. Surface, muted text, border, focus, selection, and hover roles are separate tokens. A consuming project can supply brand colors through those same public tokens.

default.css includes visual tokens, base, and components. The example.css entry contains only demonstration page composition and is opt-in. Both CSS packages declare compatible cascade layers so their import order does not change layer precedence.

This workspaceKind=styles package exports source CSS and declares CSS side effects. It requires format/format:check rather than artificial JavaScript checks. The consuming app build and browser tests verify styling.

Button hover, active, keyboard focus, disabled and pending appearances use public
`.ui-button` / `data-pending` hooks. `--ui-color-accent-active` is the pressed
surface. Disabled controls use surface/muted/line tokens without fading the entire
control. Transitions are removed under `prefers-reduced-motion: reduce`.
Dialogs use `--ui-color-surface-raised` and `--ui-color-backdrop` for modal surface
and scrim, plus the existing ink, muted, line and radius roles. Native top-layer
stacking takes precedence over local Layer overlays; it needs no arbitrary global
z-index. Hosts own theme preferences and load structure separately.

Editor verification hosts explicitly load `@frontend/puck-adapter/editor.css`
and `@frontend/styles/puck-editor.css`.
This separate entry imports pinned Puck CSS and the controlled-field hooks. The
default/public entries do not include it; load it only on an editor host.
The entry binds the public `--puck-outline-color-text` hook to Puck’s own text
token within `.ui-content-editor`. The pinned Puck 0.23 outline otherwise falls
back to an undefined token and can inherit near-white host text on its light
editor surface. This scoped repair leaves host/content theme tokens unchanged
and uses no private Puck class names.

## Fixed and selectable hosts

Hosts use ui/theme policy to choose a root data-theme. Fixed light/dark hosts
ignore preferences and omit controls. Selectable hosts can honor user preferences
or follow system CSS media queries. Policies do not remove palettes or change
layout. Single-theme sites can customize semantic tokens without designing a
second palette. CSS imports remain host-owned; there is no theme Provider.

`content-blocks.css` includes neutral media-viewer dots and state styles. Icon
controls use the default components entry. The optional `web-shell.css` entry
provides theme-aware frame, navigation and header extension appearance.

## Studio appearance

`studio-shell.css` and `studio.css` share a scoped tool palette and control
appearance: quiet surfaces, thin borders, small corners and compact typography.
The optional Studio entries do not change the foundation default or website skin.
Studio navigation, tables, fields, file actions and nested dialogs use the same
roles. Puck's vendor surface and rendered preview documents keep their own styles.

`--ui-studio-canvas`, `--ui-studio-surface`, `--ui-studio-field-surface`,
`--ui-studio-ink`, `--ui-studio-muted`, `--ui-studio-line`,
`--ui-studio-focus` and `--ui-studio-selection` can be overridden on a Studio root.
Their defaults use CSS `light-dark()` with the existing `color-scheme` policy;
light/dark/system and nested workbench preferences need no new theme state.
Keyboard focus remains visible, reduced-motion removes transitions, and forced
colors use system color roles. Load layout entries separately for structure.

The Studio entries also style the `ui-studio-resource-*` hooks: a neutral toolbar,
inline statuses and tabbed resource settings. They reuse the same Studio palette
and preserve the public tab ARIA states, including visible keyboard focus. Layout
and panel height limits remain in the structural package.

Studio controls switch foreground and surface palettes immediately, without a
background-only fade that could hide a label during theme changes. Border feedback
can still transition and follows the Studio reduced-motion token.

The content-blocks entry imports `content-discovery.css` for reading navigation
and native progress. Both use the shared light and dark colors.

The default entry includes neutral typography and muted descriptions/references
for `.ui-page-status`. Status-view geometry and action wrapping belong to
`@frontend/ui/default.css`; neither entry requires example CSS or a
resource Provider.
