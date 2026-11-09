import { Container, Column } from '@frontend/ui/layout';
import type { ReactElement, ReactNode, Ref } from 'react';
import { Heading } from '../heading/heading.js';
import { RichText } from '../rich-text/rich-text.js';
import { contentClassName, type ContentProps } from '../shared/component-props.js';
import type { ContentSectionData } from './content-section.schema.js';

export type ContentSectionProps = ContentSectionData &
  ContentProps & { readonly children?: ReactNode; readonly ref?: Ref<HTMLElement> };
export function ContentSection({
  heading,
  intro,
  body,
  outro,
  children,
  width = 'content',
  surface = 'plain',
  align,
  id,
  className,
  ref,
}: ContentSectionProps): ReactElement {
  return (
    <section
      id={id}
      ref={ref}
      className={contentClassName('ui-content-section', className)}
      data-surface={surface}
      data-align={align}
    >
      <Container width={width} className="ui-content-inner">
        <Column>
          {heading && <Heading {...heading} />}
          {intro && <RichText content={intro} />}
          {body && <RichText content={body} />}
          {children}
          {outro && <RichText content={outro} />}
        </Column>
      </Container>
    </section>
  );
}
