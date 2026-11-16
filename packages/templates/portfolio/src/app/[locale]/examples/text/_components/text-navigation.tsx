'use client';
import Link from 'next/link';
import { localeHref } from '../../../../../infra/resources/routing';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  getNavigationRevision,
  subscribeToNavigationStart,
} from '../../../../../infra/navigation/transition-start';
import { usePrepareResources } from '@frontend/resource-runtime/react';
import { textLocale, planResourceScope, RESOURCE_SCOPES } from '../../../../../infra/resources';
import { useText } from '../../../../../infra/resources/client';
export function TextNavigation() {
  const text = useText();
  const prepare = usePrepareResources();
  const router = useRouter();
  const wanted = useRef(0);
  const [warmupRevision, setWarmupRevision] = useState<number>();
  // Route changes can suspend. Observe cancellation immediately while the old page is visible.
  const preparing = useSyncExternalStore(
    subscribeToNavigationStart,
    () => warmupRevision === getNavigationRevision(),
    () => false
  );
  const csrHref = localeHref('/examples/text/csr', text.locale);
  const csrLink = useRef<HTMLAnchorElement>(null);
  useEffect(
    () => () => {
      wanted.current++;
    },
    []
  );
  async function enterCsr() {
    const generation = ++wanted.current;
    if (csrLink.current?.href === window.location.href) {
      setWarmupRevision(undefined);
      return;
    }
    const revision = getNavigationRevision();
    setWarmupRevision(revision);
    try {
      await Promise.all([
        prepare(planResourceScope(RESOURCE_SCOPES.textDemo, textLocale(text.locale)).plan),
        import('./text-demo-page'),
      ]);
    } catch {
      // The destination owns cold loading, error feedback and retry.
    }
    if (generation !== wanted.current) return;
    setWarmupRevision(undefined);
    if (revision === getNavigationRevision()) router.push(csrHref);
  }
  return (
    <nav aria-label={text.getText('main', 'textDemo.navigation.label')}>
      <div className="example-controls">
        <Link href={localeHref('/examples/text/ssr', text.locale)}>
          {text.getText('main', 'textDemo.navigation.ssr')}
        </Link>
        <Link
          ref={csrLink}
          href={csrHref}
          prefetch={false}
          onNavigate={(event) => {
            event.preventDefault();
            void enterCsr();
          }}
        >
          {text.getText('main', 'textDemo.navigation.csr')}
        </Link>
      </div>
      <p role="status">{preparing ? text.getText('main', 'textDemo.navigation.preparing') : ''}</p>
    </nav>
  );
}
