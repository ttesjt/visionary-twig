import { createElement, type ReactElement } from 'react';
import { Column } from '@frontend/ui/layout';
import { HEADING_ELEMENTS } from '../heading/heading.js';
import { contentClassName, type ContentProps } from '../shared/component-props.js';
import { richTextSchema, type RichTextData, type RichTextBlock } from './rich-text.schema.js';
import { renderInline } from './render-inline.js';

export type RichTextProps = RichTextData & ContentProps;
function renderBlock(block: RichTextBlock, index: number): ReactElement {
  if (block.type === 'paragraph') return <p key={index}>{renderInline(block.content)}</p>;
  if (block.type === 'heading')
    return createElement(
      HEADING_ELEMENTS[block.level],
      { key: index },
      renderInline(block.content)
    );
  const List = block.ordered ? 'ol' : 'ul';
  return (
    <List key={index}>
      {block.items.map((item, itemIndex) => (
        <li key={itemIndex}>{renderInline(item.content)}</li>
      ))}
    </List>
  );
}

export function RichText({ content, align, id, className }: RichTextProps): ReactElement {
  return (
    <Column id={id} data-align={align} className={contentClassName('ui-rich-text', className)}>
      {richTextSchema.parse(content).map(renderBlock)}
    </Column>
  );
}
