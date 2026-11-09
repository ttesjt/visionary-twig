export { resourceUrlSchema, linkUrlSchema, isSafeResourceUrl } from './shared/url.schema.js';
export {
  intrinsicDimensionSchema,
  imageAssetSchema,
  imageSourceSchema,
  imageSourcesSchema,
  imageMediaSchema,
  imageAssetsSchema,
  mediaFigurePropsSchema,
  mediaFitSchema,
  mediaRatioSchema,
  MEDIA_FITS,
  MEDIA_RATIOS,
  DEFAULT_MEDIA_FIT,
  DEFAULT_MEDIA_RATIO,
  type ImageAsset,
  type ImageSource,
  type ImageSources,
  type ImageMedia,
  type MediaFit,
  type MediaRatio,
  type MediaFigureData,
} from './media/image.schema.js';
export { selectImageSource, imageMediaToAsset, imageAssetToMedia } from './media/image-resource.js';
export {
  viewerImageSchema,
  viewerImagesSchema,
  type ViewerImage,
} from './media-viewer/viewer-image.schema.js';
export {
  richTextInlineSchema,
  richTextBlockSchema,
  richTextSchema,
  richTextPropsSchema,
  RICH_TEXT_HEADING_LEVELS,
  type RichTextInline,
  type RichTextBlock,
  type RichTextData,
} from './rich-text/rich-text.schema.js';
export {
  actionLinkSchema,
  actionLinksPropsSchema,
  ACTION_KINDS,
  DEFAULT_ACTION_KIND,
  ACTION_ICONS,
  type ActionLink,
  type ActionLinksData,
} from './action-links/action-links.schema.js';
export {
  headingLevelSchema,
  headingPropsSchema,
  HEADING_LEVELS,
  HEADING_APPEARANCES,
  DEFAULT_HEADING_LEVEL,
  type HeadingData,
} from './heading/heading.schema.js';
export {
  contentSectionPropsSchema,
  CONTENT_WIDTHS,
  CONTENT_SURFACES,
  type ContentSectionData,
} from './content-section/content-section.schema.js';
export {
  heroPropsSchema,
  HERO_VARIANTS,
  HERO_SIZES,
  HERO_TONES,
  type HeroData,
} from './hero/hero.schema.js';
export {
  mediaGalleryPropsSchema,
  GALLERY_LAYOUTS,
  GALLERY_NAVIGATIONS,
  GALLERY_PAGINATIONS,
  GALLERY_TRANSITIONS,
  DEFAULT_GALLERY_LAYOUT,
  type MediaGalleryData,
} from './media-gallery/media-gallery.schema.js';
export {
  mediaTextPropsSchema,
  MEDIA_POSITIONS,
  MEDIA_TEXT_PROPORTIONS,
  MEDIA_TEXT_SIZES,
  type MediaTextData,
} from './media-text/media-text.schema.js';
export { videoPropsSchema, VIDEO_TYPES, type VideoData } from './video/video.schema.js';

export { CONTENT_ALIGNMENTS, contentAlignmentSchema } from './shared/presentation.schema.js';
export { separatorPropsSchema, type SeparatorData } from './separator/separator.schema.js';

export {
  tabsPropsSchema,
  tabPanelPropsSchema,
  type TabsData,
  type TabPanelData,
} from './tabs/tabs.schema.js';

export {
  galleryTextCatalogSchema,
  viewerTextSchema,
  DEFAULT_GALLERY_TEXT,
  DEFAULT_VIEWER_TEXT,
  type GalleryText,
  type ViewerText,
} from './media/media-text.schema.js';
export { STRIP_SIZES } from './media-gallery/media-gallery.schema.js';

export {
  mediaPresentationSchema,
  MEDIA_WIDTHS,
  MEDIA_HEIGHT_LIMITS,
  DEFAULT_MEDIA_ALIGNMENT,
  type MediaPresentation,
} from './media/media-presentation.schema.js';

export {
  anchorNameSchema,
  anchorPropsSchema,
  type AnchorData,
} from './navigation/anchor.schema.js';
