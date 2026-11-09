import { richTextSchema } from '@frontend/content-blocks/schema';
import content from './content.json' with { type: 'json' };
export const sampleContent = content;
export const overviewBody = richTextSchema.parse([
  { type: 'paragraph', content: [{ type: 'text', text: sampleContent.overviewBody }] },
]);
export const detailBody = richTextSchema.parse([
  { type: 'paragraph', content: [{ type: 'text', text: sampleContent.detailBody }] },
]);
