'use client';

import { useContent, useText } from '../../../../infra/resources/client';

export function AboutSummary() {
  const text = useText();
  const { about } = useContent().getResolved('base', { text });
  return <p className="ui-portfolio-lead">{about ?? text.getText('main', 'about.description')}</p>;
}
