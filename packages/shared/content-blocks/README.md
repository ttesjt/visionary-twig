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
`component-owned CSS/content-blocks.css` explicitly in the host. Optionally
add `@frontend/styles/default.css` and `@frontend/styles/content-blocks.css`.
Domain entries preserve the shared cascade order. Layout rules have structural
fallbacks; visual rules reuse foundation tokens. No new theme token is added.
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
selection controls. Art's domain-specific ArtworkViewer is independent. The
custom pan/scroll-snap/zoom engine has been removed. Zoom buttons and Reset call
the photo engine; the view uses the full viewport without a Fullscreen API request.
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
`--ui-media-size-*`, `--ui-media-height-*` and `--ui-media-viewport-limit` tokens belong to layout-styles.
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

## Named destinations

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

Import `component-owned CSS/content-blocks.css` for anchor-clearance hooks.
