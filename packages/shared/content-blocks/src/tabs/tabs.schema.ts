import { z } from 'zod';
import { meaningfulTextSchema } from '../shared/url.schema.js';

export const tabsPropsSchema = z.strictObject({ label: meaningfulTextSchema });
export const tabPanelPropsSchema = z.strictObject({ label: meaningfulTextSchema });
export type TabsData = z.infer<typeof tabsPropsSchema>;
export type TabPanelData = z.infer<typeof tabPanelPropsSchema>;
