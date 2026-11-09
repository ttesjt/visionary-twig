# @frontend/content-blocks

Reusable semantic content and media; framework-independent, no I/O or global state.
This react-library follows the workspace package/build conventions.

## Data contract

`@frontend/content-blocks/schema` is a pure Zod entry. It imports no React, DOM,
Next or Node I/O. Each registered block has a strict `*PropsSchema`; image,
rich-text and action types derive from those schemas. Unknown fields fail rather
than silently disappear. The Puck adapter extends the object schemas with its
own node ID and slots before parsing; do not pass raw Puck nodes directly here.
React children/ref/callbacks never enter these data schemas.

Media URLs support root-relative paths and HTTP(S), without credentials, control
characters, backslashes or protocol-relative URLs. Link URLs additionally support
named document fragments. Host allowlists belong to the consuming app. Spaces
in asset paths must be URL-encoded. SVG is loaded as an image, never injected HTML.
Nondecorative images require alt; decorative images explicitly set decorative=true
and alt="". Intrinsic positive integer dimensions reserve loading space.
Image and action IDs must be unique within their own datasets.

Rich text contains paragraphs, h2–h6 and ordered/unordered lists with text,
strong, emphasis, code or labeled link inlines. It is the internal format of one
prop, not a second page tree. HTML/style/class and unknown nodes are rejected.
Available actions require a safe href; unavailable actions require a readable
reason and cannot carry href. Icons/kinds/layouts are finite schema options.
Hero requires an explicit headingLevel; other heading contexts default to h2.

Schema runtime dependency: catalog Zod 4.6.7 (already present in the baseline
lockfile); downstream adapter should consume this same version.

### Image resources

The pure schema entry also exports imageSourceSchema, imageSourcesSchema and
imageMediaSchema with inferred ImageSource/ImageSources/ImageMedia types.
ImageMedia has stable id, type=image, shared alt/caption/decorative rules and
sources: required display, optional thumbnail and optional original metadata.
Each source supplies url and its own positive integer width/height, optional
image MIME type and positive safe-integer bytes. Storage keys stay app-owned.
selectImageSource never guesses a missing original. imageMediaToAsset selects
thumbnail/display for existing single-src renderers. imageAssetToMedia is an
explicit legacy adapter using the known src/dimensions for both required roles,
without claiming original access. Existing ImageAsset/document schemas are unchanged.

## Static React API

Root exports Hero, Heading, RichText, ActionLinks, ContentSection, Tabs, TabPanel, Separator, MediaFigure
Video and MediaText. None has a client directive; MediaFigure uses a small client image
leaf solely for failure feedback. JSX data is the same schema-derived contract.
RichText, ActionLinks, images and Video validate unsafe values when rendering.
All components accept id/className hooks and reject/ignore authored style;
ContentSection additionally accepts children and a native section ref. Content
fields render before the children slot and optional outro follows it. RichText
uses foundation Column for block spacing; `--ui-layout-space-content` controls
the gap between paragraphs, headings and lists, independently of visual CSS.

Import `@frontend/ui/default.css` and
`@frontend/content-blocks/default.css` explicitly in the host. Optionally
add `@frontend/styles/default.css` and `@frontend/styles/content-blocks.css`.
Domain entries preserve the shared cascade order. Layout rules have structural
fallbacks; visual rules reuse foundation tokens. The default entry includes the
viewer dependency's stylesheet. Hosts that load content features separately can
use `content-interactions.css`, `content-discovery.css`, or
`navigation-parts.css` from `@frontend/content-blocks`.
Public hooks: ui-content-hero, ui-content-summary, ui-heading (data-appearance),
ui-rich-text, ui-content-section (data-surface), ui-action-links/item/link/reason/hint
(link data-kind/data-icon), ui-media-figure/frame/image/failure/caption
(frame data-fit/data-ratio/data-failed), ui-video-figure and ui-video.
MediaFigure accepts zoom=true and an optional zoomLabel; its link opens a local viewer and remains a real image URL without JavaScript.

Video uses native controls, playsInline and metadata preload, with optional poster
and subtitle/caption tracks. It never autoplays. Intrinsic width/height reserve
space. Loading failures keep caption/geometry; replacing the image URL resets its
local failure state. First Hero image loads eagerly, other figures lazily.

## Gallery and viewer

Import `MediaGallery` from `@frontend/content-blocks/gallery` and `MediaViewer`
from `@frontend/content-blocks/viewer`. Both entries and their emitted code retain
`use client`. They do not mark the root/schema entries as client code. Root
`MediaText` composes an image or gallery with rich text; mediaPosition is
start/end/top and proportion is balanced/text-emphasis/media-emphasis. DOM order
matches the chosen reading order; the end variant puts text first in the DOM.

Gallery requires images and a meaningful label. `copy.carouselRoleDescription`
overrides the carousel region’s assistive role description (default `carousel`);
grid and strip layouts do not emit this attribute. Like other Gallery labels, it
is validated by `galleryTextCatalogSchema`. Defaults: grid, contain,
intrinsic ratio, zoom enabled, thumbnails off. Empty data renders emptyLabel
(default "No images available"). Strip uses native overflow/scroll-snap and
never intercepts wheel events. Every image remains keyboard reachable by its
link. Carousel exposes previous/next, a live count and optional thumbnail buttons.
Focus the named gallery region to use Left/Right arrows. By default edges do not wrap;
controls disable explicitly. Autoplay and loop are opt-in; both default to false. GIF playback is
independent and is not stopped by this component. With JavaScript disabled,
carousel images render as a native strip and enhancement controls stay hidden.

Gallery session identity includes ordered image IDs and resource URLs. Replacing,
reordering or changing resources resets carousel selection to the first image
and closes its viewer, including transitions through an empty dataset. Caption
or metadata updates alone retain the session. Figure zoom resets on ID/src change.

Viewer API: images, open, currentId (string|null), onOpenChange(boolean),
onCurrentChange(string), label and optional closeLabel ("Close viewer"). All
callbacks belong to a client owner, never JSON or an RSC serialization boundary.
It uses foundation Dialog, which supplies native modality, focus containment,
Esc and focus restoration. Action buttons use labeled Lucide icons. Left/Right keys work throughout the modal, including
its initial close button. Images always display contain fit without cropping.

The additive ViewerImage contract accepts existing ImageAsset values, plus optional
original (the shared ImageSource schema) and description. `./schema` exports
viewerImageSchema/viewerImagesSchema/ViewerImage. Original metadata is accepted
for compatibility but never rendered as a link or image by the viewer. ContentDocument
and existing ImageAsset JSON formats remain unchanged.

The content Viewer uses react-photo-view 1.2.7 for photo sizing, swipe, pinch,
double-tap, drag and zoom. Its thin controlled integration retains native Dialog
modality/focus, accessible labels, image captions, display-only URLs and named
selection controls. Zoom buttons and Reset call the photo engine. The view uses
the full viewport.
Legacy actualSize/expand/restore/fit/scale/hint copy keys remain accepted for old
documents but no longer select custom zoom presets or a second viewer frame.

Motion follows prefers-reduced-motion, including image switching and opening/closing.
Failed images retain navigation and close controls, with an explicit retry action.
The photo engine's image-alt and inactive-slide accessibility bridge is isolated
at the boundary. Private original URLs are never requested. New public hooks are
ui-content-photo-surface/slider/controls/arrows/caption/failure plus the existing
ui-media-viewer, ui-viewer-tools/navigation/dot. Structural CSS imports the pinned
vendor stylesheet; no website stylesheet is needed. See THIRD_PARTY_NOTICES.md.

Viewer selection resolves from current props on every render. A missing currentId
falls back to the first item in the supplied dataset, without emitting an implicit
change callback. Empty data renders a closed Dialog and no media. This does not
mutate the caller's requested open/currentId; the caller can retain those values
or clear them. Subsequent nonempty data follows the caller's open prop. No image
from the previous dataset is cached. Single-image navigation is omitted.

## Public component and schema map

| Component / entry      | Serializable contract     | Semantic parameters                                                                              |
| ---------------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| Hero / root            | heroPropsSchema           | title, required headingLevel, summary?, image?, actions?, width (content)                        |
| Heading / root         | headingPropsSchema        | text, level (h2 default), appearance (title default)                                             |
| RichText / root        | richTextPropsSchema       | structured content                                                                               |
| ActionLinks / root     | actionLinksPropsSchema    | actions, label?; kind defaults to secondary                                                      |
| ContentSection / root  | contentSectionPropsSchema | heading?, intro?, body?, outro?, width (content), surface (plain)                                |
| MediaFigure / root     | mediaFigurePropsSchema    | image, fit (contain), ratio (intrinsic), loading (lazy), failureLabel?, zoom (false), zoomLabel? |
| MediaText / root       | mediaTextPropsSchema      | image/gallery media union, heading?, body, mediaPosition (start), proportion (balanced)          |
| MediaGallery / gallery | mediaGalleryPropsSchema   | images, label, layout (grid), fit, ratio, thumbnails, zoom, emptyLabel                           |
| Video / root           | videoPropsSchema          | label, typed sources, intrinsic dimensions, poster?, caption?, tracks?                           |
| MediaViewer / viewer   | React interface only      | controlled images/open/currentId/callbacks and accessible label                                  |

All schema constants, inferred Data types and per-block props schemas are named
exports of `./schema`. No generic page-node tree or editor runtime is included.
Root components accept ordinary JSX className/id hooks; JSON schemas reject them.
ContentSection and MediaText accept children only in React. Style objects are
rejected by types and never forwarded at runtime.

```tsx
import { ContentSection, MediaFigure, RichText } from '@frontend/content-blocks';
import { MediaGallery } from '@frontend/content-blocks/gallery';
import { imageAssetSchema, headingPropsSchema } from '@frontend/content-blocks/schema';

const image = imageAssetSchema.parse({
  id: 'overview',
  src: '/images/overview.svg',
  alt: 'System overview',
  width: 1200,
  height: 800,
  caption: 'Architecture and data flow.',
});
const puckHeadingSchema = headingPropsSchema.extend({ id: imageAssetSchema.shape.id });
// The adapter additionally declares its own allowed Puck slot paths.
void puckHeadingSchema;

export function Overview() {
  return (
    <ContentSection heading={{ text: 'Overview', level: 2 }} width="reading">
      <RichText
        content={[
          { type: 'paragraph', content: [{ type: 'text', text: 'Readable server content.' }] },
        ]}
      />
      <MediaFigure image={image} zoom />
      <MediaGallery images={[image]} label="Project screenshots" layout="strip" />
    </ContentSection>
  );
}
```

## Styling hooks

| Area                   | Public hooks and bounded attributes                                                                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text and sections      | .ui-heading[data-appearance], .ui-rich-text, .ui-content-hero, .ui-content-summary, .ui-content-section[data-surface]                                                                              |
| Actions                | .ui-action-links, .ui-action-item, .ui-action-link[data-kind][data-icon], .ui-action-icon, .ui-action-reason, .ui-action-hint; native focus and aria-disabled                                      |
| Figures                | .ui-media-figure, .ui-media-frame[data-fit][data-ratio][data-failed], .ui-media-image, .ui-media-failure, .ui-media-caption, .ui-media-zoom                                                        |
| Text/media composition | .ui-media-text[data-position][data-proportion], .ui-media-text-media, .ui-media-text-body                                                                                                          |
| Gallery                | .ui-media-gallery[data-layout][data-enhanced], .ui-gallery-items, .ui-gallery-item[data-current], .ui-gallery-thumbnails, .ui-gallery-thumbnail[aria-pressed], .ui-gallery-empty, .ui-gallery-hint |
| Viewer and controls    | .ui-media-viewer, .ui-content-photo-surface, .ui-gallery-controls, .ui-media-count; foundation's documented Dialog/Button hooks                                                                    |
| Video                  | .ui-video-figure, .ui-video                                                                                                                                                                        |

Ratios: intrinsic/square/landscape/portrait; fit: contain/cover. Narrow layouts
collapse at the foundation breakpoint of 40rem. Intrinsic dimensions are HTML
attributes, not arbitrary layout CSS values. Viewer uses native Dialog and modern
browser support requirements inherited from foundation. Default control text is
English; caller-provided titles, alt, captions and content support any language.
Icons are bounded decorative SVGs; their visible link labels supply accessible names.
There is no arbitrary icon component/HTML prop in the data format.

## Examples and verification

Source-adjacent schema, component and selection tests exercise the reusable contracts.
The Studio starter additionally exercises editor/server rendering and isolated preview behavior.
Hosts supply their own media and route-level acceptance. Run `pnpm validate` and the
relevant source-template browser checks.

`@frontend/content-blocks/README.md` is a public read-only documentation resource for local tool hosts.

Image media requires a display variant; thumbnail is optional. Card projections use
thumbnail when present and otherwise display, with that variant's actual dimensions.
Original metadata remains valid for storage compatibility but is never selected as
an image fallback or rendered as an action by MediaViewer.

Multi-image Viewer navigation uses the photo engine's own transition callback;
parent props remain authoritative. Inactive adjacent slides are hidden from
assistive technology and keyboard focus. Empty data removes the modal and no
removed resource is retained. Caption-only updates retain the photo session;
resource replacement and reopening start a new engine view.

## Presentation variants

All new props are optional. Existing JSON retains its prior defaults. Schemas stay
browser/Node safe and consume the public text-catalog template validator.

- Hero: `variant="background"` places its image behind the title/summary/actions;
  `size` is compact/comfortable/spacious, `tone` chooses light/dark foreground,
  and `align` is start/center/end. The default plain variant retains inline media.
  CSS owns overlay colors, contrast and height tokens. Background imagery is
  decorative; put required information in text or a normal MediaFigure.
- Heading, RichText and ContentSection accept the same optional `align` choices.
- MediaText adds `proportion="text-dominant"` and `mediaSize="compact|regular|full"`.
  Mobile collapse preserves DOM reading order. Global CSS owns the measurements.
- Separator renders a semantic horizontal rule. It accepts normal React id/class
  hooks, while its JSON schema remains empty and disallows arbitrary styles.
- ActionLinks adds the explicitly selected smartphone icon. `newTabHint` supplies
  the hint text; `newTabHintDisplay="accessible"` keeps it available to assistive
  technology without a visible suffix. The default remains visible.

## Tabbed content

Tabs receives a label and React children. Each TabPanel owns its own label and
body; there is no second metadata array to keep in sync. Puck registers both with
native content slots and limits Tabs children to TabPanel. Panel labels support
ordinary document bindings; normal document validation owns unique node IDs.
After enhancement the tab list follows the panels' DOM order, including native
slot moves. Panel IDs stay local to each React instance.

Arrow keys wrap through the tab list; Home/End select its ends. The active tab is
the sole tab stop. Each instance uses unique DOM IDs. Server HTML exposes every
panel and hides the nonfunctional tab controls before enhancement. Puck editing
keeps all panel slots visible; normal rendering selects one panel. Native Puck owns all nested data IDs during insertion and duplication.

## Gallery playback and screenshot strips

`loop` enables wraparound carousel controls/keys. `autoplay` requests a six-second
slideshow; default is off. The interval is defined once in the gallery module.
Playback pauses on hover/focus, outside the viewport, on hidden browser tabs and
while the Viewer is open. Manual navigation pauses it until explicitly resumed.
Reduced motion disables automatic playback. One-image galleries never start a
timer. No-JavaScript rendering retains the readable horizontal fallback.

Strip layout retains its legacy width-based sizing by default. Selecting
`stripSize="compact|regular|tall"` makes images equally high at their intrinsic
proportions, always with contain fit. CSS owns responsive heights through
`--ui-strip-height-*`. `drag` opts into desktop mouse dragging with a movement
threshold; clicks still open images and touch/trackpad scroll natively.

## Component interface copy

MediaGallery accepts `copy` and `viewerCopy`, MediaViewer accepts `copy`, and
MediaFigure accepts `viewerCopy`. All accept partial, validated dictionaries over
neutral defaults. Supported fields are exported through galleryTextCatalogSchema and
viewerTextSchema. Named template placeholders are validated before rendering;
no expressions or HTML are interpreted. `showCount=false` visually hides the
counter while preserving its status text. `showHint=false` omits the strip hint.
Legacy emptyLabel/closeLabel still take precedence over the corresponding copy
fields. Hosts own translations and may bind these props from UI catalogs; the
package never imports app dictionaries or chooses a language.

## Full-width section composition

Hero and ContentSection own a full-width outer section and a `.ui-content-inner`
Container. Their optional `width` selects `reading`, `content` (default), or
`full`; it controls the inner content, never the background. Both reuse the
shared layout width/gutter tokens, including a host-provided page inset. The
background Hero variant fills the outer section. Older Hero documents without
`width` keep the content default. Puck exposes the same bounded choices.

Place these sections directly in a full-width canvas for edge-to-edge
backgrounds. Containers inside another container reuse existing horizontal
gutters; avoid an extra containing wrapper around the entire document when
full-width sections are intended.

## Hero vertical layout

Optional `contentPosition="start|center|end"` aligns the complete content group
inside a background Hero. Its default remains center for a background cover and
start for plain content. `spaceBefore`, `spaceAfter` and `contentGap` reuse the
foundation `none|content|section` spacing options. Before/after default to section;
contentGap defaults to content. Actual dimensions remain global CSS tokens.
Start placement makes the top inset the content's starting distance; centered
placement centers within the area left by the two insets.

`size` remains a minimum-height preset for background covers, never a fixed clip.
Compact/comfortable/spacious keep their existing 16/24/36rem structural defaults;
comfortable uses compact sizing at the narrow breakpoint. Plain Hero retains its
content-driven height. Long content can always grow the section.

A host may supply `--ui-hero-safe-block-start` on a selected Hero. It is added to
both the starting padding and the background minimum height, retaining the
content area while allowing the background to extend behind host chrome. Every
Hero resets this token to zero, so nested Heroes do not inherit another cover's
clearance. It is separate from author spacing, defaults to zero, and does not
introduce a navigation dependency into this package.

## Carousel engine and JSON configuration

Carousel uses pinned Embla 8.6.0. Grid and strip remain ordinary semantic layouts;
strip keeps native horizontal scrolling and its existing optional mouse drag.
The engine owns gesture geometry and smooth transitions, while this package owns
current-image semantics, copy, control placement and lifecycle. Vendor-computed
inline transforms/opacity are internal engine output, never authored style props
or arbitrary JSON CSS. Without JavaScript all carousel images remain readable.

| Field      | Values                   | Default                                                                    |
| ---------- | ------------------------ | -------------------------------------------------------------------------- |
| navigation | overlay / below / none   | overlay                                                                    |
| pagination | dots / thumbnails / none | dots; legacy thumbnails=true selects thumbnails when pagination is omitted |
| transition | slide / fade             | slide                                                                      |

Explicit pagination takes precedence over the legacy thumbnails flag. Existing
loop, autoplay, showCount, showHint, fit, ratio, drag, stripSize and copy fields
remain accepted. One-image galleries omit arrows, pagination and playback controls;
the optional status remains available to assistive technology. Controls use named
icons with accessible labels, never variable-width visible previous/next text.
Keyboard and pointer navigation update the same selection. Dragging suppresses
accidental zoom clicks; playback pauses for manual interaction. The Puck registry
consumes these schemas unchanged, including through variable bindings. No editor
or Studio integration is required to configure these fields in JSON.

## Media placement and display bounds

`MediaFigure`, `MediaGallery` and `Video` accept the same optional `presentation`
object. `MediaText.media` accepts it through its existing image/gallery union.
Source `width`/`height` remain intrinsic asset metadata; display configuration
never changes them or the full-size photo viewer.

| Field                    | Choices                              | Meaning                                                                        |
| ------------------------ | ------------------------------------ | ------------------------------------------------------------------------------ |
| `presentation.width`     | `full`, `compact`, `regular`, `wide` | Available parent width, capped at a global preset; never wider than its parent |
| `presentation.maxHeight` | `none`, `compact`, `regular`, `tall` | Maximum image/video height, capped at 70% of the dynamic viewport when enabled |
| `presentation.align`     | `start`, `center`, `end`             | Logical inline placement; an explicit presentation defaults to center          |

Omitting presentation preserves previous geometry. Width presets default to
10rem / 20rem / 40rem; height presets default to 12rem / 20rem / 26rem. Global
`--ui-media-size-*`, `--ui-media-height-*` and `--ui-media-viewport-limit` tokens come from `@frontend/content-blocks/default.css`.
JSON accepts semantic choices, never arbitrary CSS lengths or style objects.

Gallery placement bounds the whole block, including its controls. Its separate
`itemPresentation` applies the same contract to each figure/link inside a grid,
strip or carousel. A gallery's height limit is inherited by its images unless an
item explicitly overrides it (including `none`). Item width leaves column count
and carousel slide geometry unchanged; smaller zoom links follow the visible
figure's bounds. Captions and controls are outside the image-height limit.
Existing `stripSize` still sets strip height; a new maximum can further constrain
it. Existing `MediaText.mediaSize` still bounds the media column; nested
`media.presentation` controls the image/gallery inside that column.

Contain fit preserves the whole image. Explicit cover fit may crop; an enabled
height bound takes precedence over a preferred ratio. Loading/failure geometry
uses the original HTML dimensions. The same attributes are emitted during SSR
and remain usable without JavaScript. Public hooks: `.ui-media-presentation`,
`data-media-width`, `data-media-height` and `data-media-align`.

## Named destinations and entrances

`Anchor` declares a stable destination independently of component bookkeeping IDs:

```tsx
<ActionLinks actions={[{ id: 'details-link', label: 'Details', availability: 'available', href: '#details' }]} />
<Anchor name="details"><ContentSection heading={{ text: 'Details' }}>…</ContentSection></Anchor>
```

Names start with an ASCII letter, followed by letters, digits, underscores, periods or
hyphens. Keep them independent of translated headings. Native fragments preserve URL
bookmarks, browser history and focus (`tabIndex=-1` without adding a Tab stop).
The host owns document-wide ID uniqueness; the JSON adapter validates its own document.
A destination may wrap any content group. Do not put targets inside hidden tab panels.

`Reveal` wraps a content group without changing its semantic order:

```tsx
<Reveal effect="rise" duration="normal" delay="short" trigger="visible" once>
  <MediaFigure image={image} />
</Reveal>
```

| Option   | Values                                          | Default |
| -------- | ----------------------------------------------- | ------- |
| effect   | fade, rise, slide-start, slide-end, scale, wipe | rise    |
| duration | quick, normal, gentle                           | normal  |
| delay    | none, short, long                               | none    |
| trigger  | visible, early                                  | visible |
| once     | boolean                                         | true    |

`wipe` is useful for a separator or an illustration. Logical slide directions follow
writing direction. `early` observes an 80px expanded viewport; `visible` observes the
actual viewport. Intersection uses the first visible pixel, so tall sections can enter.
Content already in view on hydration stays visible. `once=false` rearms after leaving.
Focus and fragment navigation reveal content immediately. JavaScript-disabled clients,
unsupported observers and reduced-motion users see readable content without animation.
The state never controls `display`, `hidden` or `aria-hidden`, and waiting preserves
layout dimensions. Only preset values are accepted in JSON; no CSS/JavaScript strings.

Import `@frontend/content-blocks/default.css` for both capabilities. Global motion
and anchor-clearance tokens are defined in the content interaction stylesheet. No stylesheet is imported
by the components. Editor integration is outside these runtime contracts.

## ScrollBoundary

`ScrollBoundary` is a reversible **position sensor**. It preserves its children in
place, supplies Context and an ordinary React callback, and exposes
`data-scroll-boundary-state` for CSS/DOM consumers. It does not position, hide, clone,
move or focus content. It imports no Header, application integration or editor code.

```tsx
'use client';
import { ScrollBoundary, useScrollBoundaryState } from '@frontend/content-blocks';

function Readout() {
  const state = useScrollBoundaryState(); // nearest containing boundary
  return <output>{state}</output>;
}
function Example() {
  return (
    <ScrollBoundary range="within" offset={referenceOffset} onStateChange={setPosition}>
      <Readout />
      <Article />
    </ScrollBoundary>
  );
}
```

| Prop          | Meaning                                                                                                               | Default    |
| ------------- | --------------------------------------------------------------------------------------------------------------------- | ---------- |
| range         | `past-start`: stays active beyond its start; `within`: active only while the reference line lies within the container | past-start |
| offset        | finite, nonnegative CSS pixels below the selected scroll viewport's top; clamped to its height                        | 0          |
| disabled      | stops sensing; children remain interactive                                                                            | false      |
| scrollRoot    | React-only ancestor HTMLElement in the same document; null uses the owning document viewport                          | null       |
| onStateChange | React-only state notification; use the Context hook for descendants                                                   | absent     |

`offset` is a behavioral reference coordinate, not authored CSS. Define application
values centrally or provide a measured runtime value. JSON can bind it from variables.
There are no Header constants, DOM queries for host targets or automatic host actions.
For an element scrollRoot, its inner border edge is the origin of the scroll viewport.
Other ancestor scrolls and window resize are observed too. The context hook throws
when called outside a boundary, and nested boundaries provide independent state.

| State    | Meaning                                                      |
| -------- | ------------------------------------------------------------ |
| pending  | SSR/no JS, detached/hidden layout, or not measured yet       |
| before   | container top is below the reference line                    |
| active   | start reached; for within, its end has not reached the line  |
| after    | within range has passed its end; never emitted by past-start |
| disabled | sensing explicitly disabled                                  |

Equality at the start activates; equality at the end deactivates a bounded region.
An empty within range is never active. Callback notifications begin with the first
measured/disabled state and occur only on changes; a fresh callback identity does not
re-emit the same state. If layout becomes hidden after measurement it reports pending.
Unmount disconnects subscriptions and cancels queued work; it does not invent a final
state or clean up an external consumer's registrations.

IntersectionObserver watches stable original-position markers. Shared passive scroll
and resize/layout subscriptions cover fast jumps that skip a complete viewport between
observer samples, including restored/deep-linked positions. Notifications from a document
share a frame batch; React updates only when state changes. ResizeObserver, image load
and font loading remeasure layout. Without observer APIs, basic scroll/resize/load tracking
continues. SSR/no-JS content stays readable with an explicit pending state. Sensing is
independent of reduced-motion preferences and does not animate anything.

Import `@frontend/content-blocks/default.css` for the structural hooks. The wrapper
forms a flow root; markers are out of flow and excluded from accessibility. Readable
content and focus are never hidden by a sensing state. Style the state externally when
needed, and keep the measured container geometry stable across those visual changes.

## Reading navigation

`ContentNavigation` wraps a document's reading region. Give it `label`, optional
`title`, `progressLabel`, and ordered `items: [{label, href: '#anchor-name'}]`.
Place the corresponding `Anchor` components inside its children. Native links
preserve fragments, history, keyboard navigation and no-JavaScript reading.
The current chapter follows the upper reading band, including the original row's
height so an expanding flow Header does not undo a clicked chapter highlight.
Progress measures the content inside the reading region.

`inlineWidth` reuses the standard Container widths: `content` (default), `reading`
and `full`. Only the original inline row and its progress rail are constrained;
the reading body and registered Header surface keep their own layout. Container
widths use the same global width, gutter and inset tokens as ContentSection, and
respect an existing parent Container. `full` fills the available parent width;
it does not break out of a parent into the viewport. Older JSON without this
option now uses the content width. No stored-document migration is needed.

```tsx
<ContentNavigation
  label="In this project"
  title="Paper Atlas"
  progressLabel="Reading progress"
  items={[{ label: 'Process', href: '#process' }]}
>
  <Anchor name="process">
    <h2>Process</h2>
    <p>...</p>
  </Anchor>
</ContentNavigation>
```

Without an integration provider the navigation stays inline. To dock it, a host
installs `ContentNavigationIntegrationProvider` with a stable `integration`:

- `Dock` receives `resourceKey`, `children` and `bottom`; it owns registration and cleanup.
- Optional `Menu` receives `trigger`, `label`, `children`; it owns accessible popover behavior.
- `geometry(origin)` returns live `boundaryOffset`, `readingOffset`, `releaseOffset`
  in viewport CSS pixels, plus `observedElements` whose resizing changes those edges.

The shared package never queries a site Header. Start sensing includes the expanded
Header edge so growth cannot oscillate the handoff; release sensing uses the primary
edge. The inline row retains its space and becomes inert/hidden only while docked.
Focus inside that row defers handoff. A focused Header navigation stays mounted
until focus leaves it, even when scrolling back, so keyboard focus is never hidden.
A document needs sufficient following scroll
space to move its complete reading region above the release edge.

`ContentNavigationHeader` and `ContentReadingProgress` are reusable presentation
components. React's optional `headerContent` / `progressContent` can replace them
inside a ContentNavigation; `useContentReading()` supplies `{href, progress}` in
that context, including the registered Header subtree. Progress updates do not
re-register the Header. Do not call the hook outside this reading context.

The content-blocks stylesheets include the `content-discovery.css` entry for
`ui-content-navigation-*` and `ui-content-reading-progress`. Use
`--ui-content-navigation-row-size` to adjust the navigation row height. The
progress transition respects reduced-motion settings.

ScrollBoundary additionally accepts React-only `getOffset(element)`: a live,
finite nonnegative reference coordinate, re-read on geometry changes. This supports
measured host edges without putting Header knowledge or functions into JSON.

### Composable reading navigation

`ContentNavigation` remains one React/Puck block. Its optional `presentation`
selects a registered `preset`, preset `options`, and optional `parts.title`,
`parts.item`, or `parts.progress` replacements (`{ id, options? }`). An omitted
presentation uses the neutral default. A replacement replaces the whole slot
selection; it does not implicitly merge the replaced part's options. Each selected
part's schema applies its own defaults. Presets may declare an `overrides`
allowlist; when present, an omitted slot is closed to replacement.

Use `createNavigationCatalog` and `defineNavigationPreset` from `/schema` to define
pure, server/browser-safe schemas and preset composition. The neutral `default`
name is reserved. Hosts then pair that catalogue with Title/Item/Progress React
components through `createNavigationPresentationRegistry` and mount
`NavigationPresentationProvider`. Components and schemas use separate entry
points so server validation never needs a client registry. No theme names or
project records enter this package.

Part props include validated `options`, `navigation`, `reading`, and `placement`
(`inline`, `header`, `menu`, or `trigger`), plus zero-based `currentIndex` and
`itemCount`. Item parts additionally receive their own zero-based `index` and
`current` state. The compact trigger renders the same part inside a shared native
button, so parts must not return interactive elements. Shared surfaces own native links, accessible link
labels, `aria-current`, focus retention and progressbar semantics. A custom part
renders noninteractive contents, with decorative media hidden from assistive
technology; it must not add links/buttons or duplicate progressbar semantics.
Visual renderers stay mounted and retain the selected design through entry,
exit, hidden copies and menu readiness. `active` controls eligibility for side
effects; `interactive` independently reports interaction readiness. Custom parts
must render their visual structure for both flag values and gate subscriptions,
timers and other effects with `active`, cleaning up when it becomes false.
Shared surfaces use `inert` for unavailable interaction; hiding/clipping remains
host/layout-owned. `NavigationSurfaceActivityProvider` accepts both flags;
`interactive` defaults to `active` for hosts with a single readiness policy.
Reading state lives in the navigation session and survives handoff. Scope any
further state shared across placements to a host-owned session. The compact
breakpoint is 48rem in both the content navigation stylesheet and its responsive observer.

The optional whole-surface `headerContent`/`progressContent` React escape hatches
remain available and take precedence over the respective docked parts. Unlike
part customization, those escape hatches own their own accessible structure.

A part definition may declare `mediaSources(options)` for the resources its
renderer actually uses. Hosts must use the same catalogue for validation,
rendering and media inspection. Unknown IDs, invalid options and disallowed
replacements fail explicitly; they never silently fall back to a different design.

### Configurable navigation parts

The client entry exports `ConfigurableNavigationTitle`, `ConfigurableNavigationItem`
and `ConfigurableNavigationProgress`. `/schema` exports their schemas, inferred
option types, `configurableNavigationDefinitions`, configuration bounds and pure
item/progress resolvers. Register the `configurable` definition and renderer in
each relevant slot of the host catalogue/registry; nothing registers globally.
React and Puck consume the same options. Site presets may layer their defaults
on top, while shared parts contain no website palette or assets.

Title options: `display: text | media | media-text` (default text), optional `media`,
`mediaSize: small | medium | large`, `mediaFit: contain | cover`, `appearance`,
and `compact: same | media | text`. `mediaShape: intrinsic` preserves a wide logo's
aspect ratio at the selected media height; square remains the default. The
`--ui-navigation-media-max-width` hook bounds wide artwork (default 10rem). An image uses `{kind: 'image', src}`; an icon
uses `{kind: 'icon', name}` from `NAVIGATION_ICONS`. Media display requires explicit
media. The title's accessible name always comes from `title ?? label`.

Item options group label/media choices under `representation` with the same
`display`, `media`, `mediaSize`, `mediaFit` fields, plus optional `showIndex`.
The framework retains `item.label` as the accessible link/button name, including
image-only displays. Decorative images have empty alternative text. `base`,
`unselected` and `selected` independently configure `color`, `background`,
`borderColor`, `borderWidth: none | thin | thick`, `radius: none | soft | pill`,
`underline`, `font: system | mono | serif`, `weight: regular | medium | semibold`,
and optional `palette`. Each state may also override `representation`, including
a different image, media size or text/media display mode.

Resolution is field-wise: common base + current state, then `cycle[index % length]`
base + state, then `overrides[href]` base + state. Each layer may also override
representation fields. Reordering preserves anchor-keyed overrides; cycle behavior
intentionally follows the new order. Omitted state fields never reset the other
state. Missing overrides retain their preceding value; `media: null` explicitly
removes inherited media (with text display). A slot replacement still replaces
its entire selection; these rules apply _inside_ a selected configurable part.

Progress options: `height` (1–16 CSS pixels), `color`, `track`, `rounded`, optional
`marker`, `markerSize` (8–40 pixels), optional `ticks` (2–24) and `checkpoints`.
`cycle[currentIndex % length]`, ascending unique `stages: [{at, design}]` thresholds (last reached stage)
in [0, 1], and anchor-keyed `sections[href]` override the base in that order.
Progress is continuous reading geometry, not equal sections. The marker travels
at the fill's tip with an inset reserved at both ends and a row tall enough to
contain it. SVG attributes carry geometry, never authored inline CSS. Its
Initial geometry is measured before paint even during Header entry; its
ResizeObserver runs only while the surface is active and releases on deactivation.
Hidden/exiting copies retain their selected visual tree. Custom animated markers
must also respect the existing activity and reduced-motion contracts.

Colors are semantic references from `NAVIGATION_COLORS`: `inherit`, `ink`, `muted`,
`surface`, `raised`, `line`, `accent`, `accent-soft`, `transparent`. Defaults use
system theme tokens. `palette` selects a host CSS scope via `data-palette`; the
host defines `--ui-navigation-accent` / `--ui-navigation-accent-soft`, including
light/dark/system variants. Arbitrary CSS or executable expressions are not JSON
options. Custom colors remain unrestricted in the host's styles-kind package.
Public CSS overrides include `--ui-navigation-part-gap`,
`--ui-navigation-title-padding`, `--ui-navigation-item-padding`,
`--ui-navigation-media-size`, `--ui-navigation-radius`, `--ui-navigation-font-mono`
and `--ui-navigation-font-serif`. All use `@frontend/content-blocks/default.css`
and `styles/content-blocks.css`; no site stylesheet is required.

For example, an item slot can use:

```json
{
  "id": "configurable",
  "options": {
    "representation": { "display": "media-text", "media": { "kind": "icon", "name": "compass" } },
    "base": { "radius": "soft", "borderWidth": "thin", "borderColor": "transparent" },
    "unselected": { "color": "muted" },
    "selected": { "color": "accent", "background": "accent-soft", "borderColor": "accent" },
    "cycle": [{ "base": { "palette": "first-tone" } }, { "base": { "palette": "second-tone" } }],
    "overrides": { "#details": { "selected": { "underline": true } } }
  }
}
```

Configurable media declarations include image sources in selectable cycles,
anchor overrides, progress markers and stages. Pure text representations do not
consume their unused media. Hosts must pass the same catalogue to rendering,
validation and publication media inspection.
