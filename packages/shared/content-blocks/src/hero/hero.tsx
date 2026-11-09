import { Column, Container } from '@frontend/ui/layout';
import type { ReactElement } from 'react';
import { ActionLinks } from '../action-links/action-links.js';
import { Heading } from '../heading/heading.js';
import { MediaFigure } from '../media/media-figure.js';
import { MediaImage } from '../media/media-image.js';
import { contentClassName, type ContentProps } from '../shared/component-props.js';
import type { HeroData } from './hero.schema.js';

export type HeroProps = HeroData & ContentProps;
export function Hero({
  title,
  headingLevel,
  summary,
  image,
  actions,
  variant = 'plain',
  width = 'content',
  size = 'comfortable',
  contentPosition = variant === 'background' ? 'center' : 'start',
  spaceBefore = 'section',
  spaceAfter = 'section',
  contentGap = 'content',
  tone = 'light',
  align,
  id,
  className,
}: HeroProps): ReactElement {
  return (
    <section
      id={id}
      className={contentClassName('ui-content-hero', className)}
      data-variant={variant}
      data-size={size}
      data-content-position={contentPosition}
      data-space-before={spaceBefore}
      data-space-after={spaceAfter}
      data-tone={tone}
      data-align={align}
    >
      {variant === 'background' && image && (
        <div className="ui-hero-background" aria-hidden="true">
          <MediaImage image={image} fit="cover" ratio="intrinsic" loading="eager" />
        </div>
      )}
      <Container width={width} className="ui-content-inner">
        <Column space={contentGap} className="ui-hero-content">
          <Heading text={title} level={headingLevel} appearance="display" />
          {summary && <p className="ui-content-summary">{summary}</p>}
          {actions && <ActionLinks actions={actions} />}
          {variant === 'plain' && image && <MediaFigure image={image} loading="eager" />}
        </Column>
      </Container>
    </section>
  );
}
