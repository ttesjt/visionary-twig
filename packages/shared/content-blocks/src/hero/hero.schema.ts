import { z } from 'zod';
import { SPACES } from '@frontend/ui/layout-options';
import { contentAlignmentSchema, contentWidthSchema } from '../shared/presentation.schema.js';
import { actionLinksPropsSchema } from '../action-links/action-links.schema.js';
import { headingLevelSchema } from '../heading/heading.schema.js';
import { imageAssetSchema } from '../media/image.schema.js';
import { meaningfulTextSchema } from '../shared/url.schema.js';

export const HERO_VARIANTS = ['plain', 'background'] as const;
export const HERO_SIZES = ['compact', 'comfortable', 'spacious'] as const;
export const HERO_TONES = ['light', 'dark'] as const;

export const heroPropsSchema = z.strictObject({
  title: meaningfulTextSchema,
  width: contentWidthSchema.optional(),
  variant: z.enum(HERO_VARIANTS).optional(),
  size: z.enum(HERO_SIZES).optional(),
  contentPosition: contentAlignmentSchema.optional(),
  spaceBefore: z.enum(SPACES).optional(),
  spaceAfter: z.enum(SPACES).optional(),
  contentGap: z.enum(SPACES).optional(),
  tone: z.enum(HERO_TONES).optional(),
  align: contentAlignmentSchema.optional(),
  headingLevel: headingLevelSchema,
  summary: meaningfulTextSchema.optional(),
  image: imageAssetSchema.optional(),
  actions: actionLinksPropsSchema.shape.actions.optional(),
});
export type HeroData = z.infer<typeof heroPropsSchema>;
