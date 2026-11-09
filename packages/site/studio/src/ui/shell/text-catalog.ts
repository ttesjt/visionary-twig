import { z } from 'zod';
import defaults from './text/default.json' with { type: 'json' };
const text = z.string().trim().min(1);
export const studioShellTextCatalogSchema = z.strictObject({
  navigation: text,
  openNavigation: text,
  closeNavigation: text,
  skipToContent: text,
  loading: text,
  pageFailed: text,
  retry: text,
  theme: z.strictObject({ label: text, light: text, dark: text, system: text }),
});
export type StudioShellTextCatalog = z.infer<typeof studioShellTextCatalogSchema>;
export const DEFAULT_STUDIO_SHELL_TEXT = studioShellTextCatalogSchema.parse(defaults);
