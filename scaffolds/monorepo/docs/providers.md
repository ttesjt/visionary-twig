# Providers and resource ownership

A Provider owns React lifecycle and publishes a reader; resource objects own
validation, immutable data and synchronous access outside React too. Sharing this
model makes Text, AppConfig and Content usable during SSR and with another UI/state
system. This integration is a practical starting point you may replace.

## Resource Providers

The starter Layout provides one ResourceRuntimeProvider and Text, AppConfig and
Content Providers. A small site normally has one main dictionary per locale, one
app configuration and one base content namespace. ResourceScope declares requirements,
plans them together and uses ResourceBoundary for waiting, errors and retry.

- Runtime owns loading, bounded caching, request deduplication and deadlines.
- Providers own installed namespaces and immutable synchronous readers.
- A Guardian blocks its dependent subtree until its resources/readers are ready.
- Business components read synchronously and do not edit resource values.

Additional namespaces normally append to the nearest Provider. A lazy content
section needs a gate, not another Provider. Closing it removes its gate; the data
remains readable in that Provider until the owner unmounts.

Use a nested Provider for deliberately independent visibility/lifetime. It inherits
the parent reader and contributes local namespaces. Colliding ancestor declarations
are rejected. A page Provider also permits a page-specific SSR snapshot: App Router
prepares Layout and Page independently and passes results down, without setting
state up into a parent. Ordinary pages consume Layout readers directly.

Each rendered scope uses one language. Switching prepares all active target-locale
requirements before publishing. SSR snapshots initialize readers before first render;
CSR gates wait for missing resources. Never install initial resources in an Effect
after dependent content has already appeared. Secrets never enter client readers.
See the full [initialization contract](resource-initialization.md) and
[scope model](resource-model.md).

## Other lifetimes

AppConfig expresses public app policy; user preferences and consent are separate
state. For example, tracking.enabled allows tracking but does not grant visitor
permission. Tracker instances live in app infrastructure and are synchronized by
initialization components; turning tracking off disables its callbacks and delivery.

Editor/project sessions belong to their document/workspace and retain dirty,
revision/conflict and publication rules. Route/document replacement deliberately
ends that lifetime. Shared controls such as Tabs, scroll sensors, reading navigation
and Puck editors own their own local contexts; do not lift them into global app
Providers just to make every context look alike.

Use each public package API and its package README. Relevant shared contracts:
[resource runtime](../packages/shared/resource-runtime/README.md),
[Text](../packages/shared/text-catalog/README.md),
[AppConfig](../packages/shared/app-config/README.md),
[content blocks](../packages/shared/content-blocks/README.md) and
[editor adapter](../packages/shared/puck-adapter/README.md).
