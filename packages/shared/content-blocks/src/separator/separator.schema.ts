import { z } from 'zod';

export const separatorPropsSchema = z.strictObject({});
export type SeparatorData = z.infer<typeof separatorPropsSchema>;
