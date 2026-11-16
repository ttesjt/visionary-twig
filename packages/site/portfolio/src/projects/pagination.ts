import { z } from 'zod';

export const DEFAULT_PROJECT_PAGE_SIZE = 24;
export const MAX_PROJECT_PAGE_SIZE = 100;
export const projectPageSizeSchema = z.number().int().positive().max(MAX_PROJECT_PAGE_SIZE);
