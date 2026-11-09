import { Fragment, type ReactNode } from 'react';
import type { RichTextInline } from './rich-text.schema.js';

export function renderInline(nodes: readonly RichTextInline[]): ReactNode {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return <Fragment key={index}>{node.text}</Fragment>;
      case 'strong':
        return <strong key={index}>{node.text}</strong>;
      case 'emphasis':
        return <em key={index}>{node.text}</em>;
      case 'code':
        return <code key={index}>{node.text}</code>;
      case 'link':
        return (
          <a key={index} href={node.href}>
            {node.label}
          </a>
        );
    }
  });
}
