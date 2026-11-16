import { z } from 'zod';

export const projectIdSchema = z.string().trim().min(1);
export type ProjectId = z.infer<typeof projectIdSchema>;

export const projectSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
