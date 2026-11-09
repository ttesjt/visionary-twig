import type { ReactElement, ReactNode } from 'react';
import { Container, type ContainerProps } from '../../layout.js';

export interface SiteFrameProps {
  readonly header?: ReactNode;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
  readonly skipLabel: string;
  readonly className?: string;
  readonly mainId?: string;
  readonly width?: ContainerProps['width'];
  /** Full canvases own their inner content containers. Header/footer framing is independent. */
  readonly contentLayout?: 'contained' | 'full';
}

export function SiteFrame({
  header,
  footer,
  children,
  skipLabel,
  className,
  mainId = 'main-content',
  width = 'content',
  contentLayout = 'contained',
}: SiteFrameProps): ReactElement {
  return (
    <div
      className={className ? `ui-site-frame ${className}` : 'ui-site-frame'}
      data-content-layout={contentLayout}
    >
      <a className="ui-site-skip-link" href={`#${mainId}`}>
        {skipLabel}
      </a>
      {header}
      <main className="ui-site-main" id={mainId} tabIndex={-1}>
        {contentLayout === 'full' ? children : <Container width={width}>{children}</Container>}
      </main>
      {footer}
    </div>
  );
}
