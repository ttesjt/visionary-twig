import type { JsonObject } from '@frontend/ui-document';
import { contentSectionPropsSchema, richTextPropsSchema } from '@frontend/content-blocks/schema';
import type { RichTextBlock } from '@frontend/content-blocks/schema';
import type { DocumentComponentName } from './catalog.js';

function hasText(blocks: readonly RichTextBlock[]): boolean {
  return blocks.some((block) => {
    const groups = block.type === 'list' ? block.items : [block];
    return groups.some((group) =>
      group.content.some(
        (inline) => (inline.type === 'link' ? inline.label : inline.text).trim().length > 0
      )
    );
  });
}

/** Only structurally empty layouts and empty text are suppressed. Visual elements,
 * including a section surface or a separator, are content even without text.
 */
export function componentHasOwnContent(type: DocumentComponentName, props: JsonObject): boolean {
  if (
    type === 'Container' ||
    type === 'Row' ||
    type === 'Column' ||
    type === 'Grid' ||
    type === 'Anchor' ||
    type === 'Reveal' ||
    type === 'ScrollBoundary' ||
    type === 'ContentNavigation'
  )
    return false;
  if (type === 'Tabs') return Array.isArray(props.content) && props.content.length > 0;
  if (type === 'RichText') {
    const { id, ...data } = props;
    void id;
    return hasText(richTextPropsSchema.parse(data).content);
  }
  if (type === 'ContentSection') {
    const { id, content, ...data } = props;
    void id;
    void content;
    const section = contentSectionPropsSchema.parse(data);
    return Boolean(
      section.heading ||
      (section.surface && section.surface !== 'plain') ||
      hasText(section.intro ?? []) ||
      hasText(section.body ?? []) ||
      hasText(section.outro ?? [])
    );
  }
  return true;
}
