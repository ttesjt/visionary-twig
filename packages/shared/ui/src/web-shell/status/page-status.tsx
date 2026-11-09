import type { ReactElement, ReactNode } from 'react';

export interface PageStatusProps {
  readonly kind: 'loading' | 'empty' | 'error';
  readonly title: string;
  readonly headingLevel?: 1 | 2;
  readonly children?: ReactNode;
  readonly action?: ReactNode;
}

/** Presentation only: route owners decide HTTP status, retry behavior and disclosure. */
export function PageStatus({
  kind,
  title,
  headingLevel = 2,
  children,
  action,
}: PageStatusProps): ReactElement {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <section
      className="ui-page-status"
      data-kind={kind}
      aria-label={title}
      role={kind === 'loading' ? 'status' : undefined}
    >
      <Heading>{title}</Heading>
      {children}
      {action}
    </section>
  );
}
