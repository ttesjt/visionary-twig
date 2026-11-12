# Frontend code standards

These rules supplement the [TypeScript code standards](code-standards.md).

## F1. Components and presentation

Group components with their feature; split large components into semantically
independent regions or interactions. Separate content reading, validation and
transformation from complex interaction and large render trees. Keep small local
helpers nearby rather than scattering trivial component fragments.

Keep visual values such as color, spacing, breakpoints and stacking levels in the
owning shared style/token definitions. A project's stylesheet technology and file
location are repository choices, not prescribed by this portable standard.

## F2. React naming, hooks and state

For React, component names use PascalCase and hooks use camelCase with a use prefix.
Hooks own logic that actually requires React state or lifecycle. Reusable ordinary
algorithms remain ordinary functions; do not wrap them in hooks just to share them.

Components own their interaction state. Do not maintain a second state value when
it can be derived from props or existing state. Shared state needs an explicit owner
and lifecycle; a global store is not the default answer to component communication.
Do not conceal fetches in ordinary synchronous render functions. Framework-supported
server resource preparation belongs in an explicit loading boundary.

## F3. Browser and server boundaries

Keep browser interaction, server-safe code and runtime-specific code behind appropriate
entries. One browser interaction module must not turn an entire foundational component
or schema collection into client-only code. Preserve framework-required entry names,
default exports and client directives. SSR and client rendering must respect the
same data and ownership contracts.

## F4. Async interaction and frontend errors

Apply G8 to navigation, language changes, loading and persistence: release resources
on cleanup and prevent late results replacing the current user state. Failures must
not appear as successful empty content. Present concise user-facing feedback while
retaining actionable diagnostic identity and context at the handling boundary.

## F5. Frontend verification

Test long text, empty collections, invalid input and interaction state transitions.
Use real-browser verification for layout, focus and SSR behavior; mocks and component
snapshots alone do not establish those contracts. Verify reusable behavior and actual
consumer paths, preserving meaningful defaults and real schemas in acceptance tests.
