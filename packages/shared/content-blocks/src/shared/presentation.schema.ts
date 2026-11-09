import { CONTAINER_WIDTHS } from '@frontend/ui/layout-options';
import { z } from 'zod';

export const CONTENT_ALIGNMENTS = ['start', 'center', 'end'] as const;
export const contentAlignmentSchema = z.enum(CONTENT_ALIGNMENTS);

export const contentWidthSchema = z.enum(CONTAINER_WIDTHS);
