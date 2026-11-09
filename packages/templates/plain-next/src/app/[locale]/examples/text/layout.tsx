'use client';
import type { ReactNode } from 'react';
import { useText } from '../../../../infra/resources/client';
export default function TextLayout({ children }: { readonly children: ReactNode }) {
  const text = useText();
  return (
    <main className="example-page example-sections">
      <p data-testid="layout-greeting" lang={text.locale}>
        {text.getText('main', 'home.title')}
      </p>
      {children}
    </main>
  );
}
