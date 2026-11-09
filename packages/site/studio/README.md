# Studio UI

The package provides a reusable workspace shell. Hosts select routes, page components,
validated text, appearance preferences and CSS.

## Workspace shell and code-owned extensions

`StudioShell` renders grouped navigation, a sticky header, an accessible mobile
navigation dialog, a page heading and a content area. `createStudioRegistry`
registers ordinary React page components. The shell entry imports no Puck editor,
SQL, storage adapter, application code or website styles. Specialized editors and
business workflows are extensions; registration is not a form-generation schema.

```tsx
import { createStudioRegistry, StudioShell, type StudioPageContext } from '@frontend/studio/shell';

function NotesPage({ navigate }: StudioPageContext) {
  return <MyNotesEditor onDone={() => navigate('overview')} />;
}

const registry = createStudioRegistry({
  groups: [{ id: 'content', label: text.content }],
  pages: [
    { id: 'overview', title: text.overview, group: 'content', component: OverviewPage },
    { id: 'notes', title: text.notes, group: 'content', component: NotesPage },
  ],
});

<StudioShell
  registry={registry}
  activePageId={currentPageId}
  navigation={{ href: pageHref, navigate: navigateToPage }}
  brand={text.brand}
  workspace={text.workspace}
  text={text.chrome}
/>;
```

IDs use kebab-case and remain independent of translated labels and resource IDs.
Groups/pages appear in registration order. Empty registries, duplicate IDs,
missing groups and empty titles fail at registration. Inputs are copied and
frozen so later mutations cannot silently change registered navigation.
Descriptions and React icons are optional. Text comes from the host's validated
dictionary; `studioShellTextCatalogSchema` is available at `./shell/text-catalog`.
The `./shell/registry` entry is editor- and React-runtime-independent.

The host supplies an active ID, real hrefs and navigation. The shell intercepts
ordinary navigation clicks, preserving modified-click URLs. The host owns routing,
deep-link validation, actual 404 responses and browser history. With a persistent
host layout, the shell's selected appearance remains across page transitions.
Fixed `themePolicy` omits appearance controls. Without `appearance`, preferences
are session-local to the mounted shell. To restore persisted preferences or own
the state elsewhere, pass `appearance={{ preference, setPreference }}`. This is a
controlled value: both the topbar and `useStudioTheme().setPreference` notify the
host, which supplies the updated preference. Fixed policies still override it
and suppress change callbacks. Cookie/storage I/O remains in the host; the shared
shell never chooses a persistence mechanism.
`useStudioTheme()` from `./shell` exposes the effective `preference`, `policy` and
`setPreference` to descendants, including focused child routes. It requires a
`StudioShell` ancestor. Resource tools inherit the shell's CSS theme rather than
initializing a second UI theme. Fixed policies also govern requests through this hook.

Pages receive `page`, `registry` and `navigate`. They own their UI, data, validation,
actions and persistence. The shell does not automatically save or publish a page,
interpret its fields, or supply credentials. `headerActions`/`footer` are host slots.
A client-render failure inside a page is isolated from navigation; retry remounts
that page. Lazy pages use a loading fallback. Hosts using nested routes may put
`StudioPageOutlet` in each route inside the shell; without children, the shell
renders the registered component itself.

Hosts explicitly import these independently replaceable global entries:

```ts
import '@frontend/ui/default.css';
import '@frontend/styles/default.css';
import 'component-owned CSS/studio-shell.css';
import '@frontend/styles/studio-shell.css';
```

Structural hooks live in layout-styles; appearance stays in styles. Public hooks
include `ui-studio-shell`, `ui-studio-sidebar`, `ui-studio-topbar`,
`ui-studio-main`, `ui-studio-page-navigation`, `ui-studio-page-heading`,
`ui-studio-surface`, `ui-studio-flow`, `ui-studio-grid`, `ui-studio-feature`,
`ui-studio-field` and `ui-studio-button`. `[data-emphasis=strong]` and
`[data-variant=primary]` are bounded visual variants. Sidebar/content widths and
spacing are controlled by `--ui-studio-sidebar-width`, `--ui-studio-content-width`
and `--ui-studio-page-inset`. No component stylesheets or authored inline styles
are required. The appearance supports foundation themes, narrow viewports,
reduced motion and forced colors.

## Host-owned nested routes

A registry entry may use `rendering: 'route'` instead of a `component`. It still
supplies the sidebar identity, title, description, group and icon. The host passes
its router's content as `StudioShell` children and resolves all child URLs to the
same active entry. `StudioPageOutlet` is only for component-owned entries; it
rejects a route-owned entry without route content.

Pass `contentKey` when the child content changes without changing activePageId.
This restores main focus and resets a failed child boundary while preserving
healthy nested layouts and their state. The key is router-neutral; the shared
package imports no Next APIs. Clicking an active sidebar entry still invokes the
host navigation callback, allowing a child page to return to its module root.

`StudioShell.pageHeading` is an optional React node: undefined shows registered
metadata, null omits the repeated heading, and a node supplies host-specific
content. Navigation, error boundaries and route content lifetime stay unchanged.
