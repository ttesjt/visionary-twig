import type { ComponentPropsWithRef } from 'react';
import { Container, Row, Column, Grid } from '@frontend/ui/layout';
import type { ComponentRenderers } from './types.js';

type SlotHostProps = ComponentPropsWithRef<'div'>;

function hostAttributes({ style, ...props }: SlotHostProps) {
  // Preserve native Puck drop-zone data attributes/ref. Foundation owns layout
  // styling, including the empty-slot minimum size supplied by editor CSS.
  void style;
  return props;
}

/** The slot itself owns the layout element. Wrapping a default slot div in Grid/Row
 * would make that div the only layout item, collapsing all columns into one cell.
 */
export const layoutRenderers: Pick<ComponentRenderers, 'Container' | 'Row' | 'Column' | 'Grid'> = {
  Container: ({ content: Content, width, as }) => {
    function Host(host: SlotHostProps) {
      const { children, ...attributes } = hostAttributes(host);
      const props = {
        ...(width === undefined ? {} : { width }),
        ...attributes,
      };
      if (as === 'section')
        return (
          <Container as="section" {...props}>
            {children}
          </Container>
        );
      if (as === 'article')
        return (
          <Container as="article" {...props}>
            {children}
          </Container>
        );
      return <Container {...props}>{children}</Container>;
    }
    return <Content as={Host} />;
  },
  Row: ({ content: Content, space, align, collapse, justify, wrap }) => {
    function Host(host: SlotHostProps) {
      const { children, ...attributes } = hostAttributes(host);
      return (
        <Row
          {...(space === undefined ? {} : { space })}
          {...(align === undefined ? {} : { align })}
          {...(collapse === undefined ? {} : { collapse })}
          {...(justify === undefined ? {} : { justify })}
          {...(wrap === undefined ? {} : { wrap })}
          {...attributes}
        >
          {children}
        </Row>
      );
    }
    return <Content as={Host} />;
  },
  Column: ({ content: Content, space, align }) => {
    function Host(host: SlotHostProps) {
      const { children, ...attributes } = hostAttributes(host);
      return (
        <Column
          {...(space === undefined ? {} : { space })}
          {...(align === undefined ? {} : { align })}
          {...attributes}
        >
          {children}
        </Column>
      );
    }
    return <Content as={Host} />;
  },
  Grid: ({ content: Content, space, columns, collapse }) => {
    function Host(host: SlotHostProps) {
      const { children, ...attributes } = hostAttributes(host);
      return (
        <Grid
          {...(space === undefined ? {} : { space })}
          {...(columns === undefined ? {} : { columns })}
          {...(collapse === undefined ? {} : { collapse })}
          {...attributes}
        >
          {children}
        </Grid>
      );
    }
    return <Content as={Host} />;
  },
};
