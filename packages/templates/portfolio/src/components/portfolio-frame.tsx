'use client';

import type { ReactNode } from 'react';
import { SiteFrame } from '@frontend/ui/web-shell';
import { useText } from '../infra/resources/client';
import { SiteNavigation } from './site-navigation';

export function PortfolioFrame({
  children,
  preferenceExtensions,
}: {
  readonly children: ReactNode;
  readonly preferenceExtensions?: ReactNode;
}) {
  const text = useText();
  return (
    <SiteFrame
      className="ui-portfolio-frame"
      contentLayout="full"
      header={<SiteNavigation preferenceExtensions={preferenceExtensions} />}
      skipLabel={text.getText('main', 'navigation.skipToMain')}
    >
      {children}
    </SiteFrame>
  );
}
