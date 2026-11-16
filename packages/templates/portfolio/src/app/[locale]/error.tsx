'use client';
import { PageStatusView } from '../../infra/errors/status-view';
import { errorDigest } from '../../infra/errors/diagnostics';
import { useText } from '../../infra/resources/client';
import { localeHref } from '../../infra/resources/routing';

export default function PageError({
  error,
  retry,
}: {
  readonly error: unknown;
  readonly retry: () => void;
}) {
  const text = useText();
  const digest = errorDigest(error);
  return (
    <PageStatusView
      as="div"
      homeHref={localeHref('/', text.locale)}
      text={{
        title: text.getText('main', 'status.error.title'),
        description: text.getText('main', 'status.error.description'),
        home: text.getText('main', 'status.home'),
      }}
      action={{ label: text.getText('main', 'status.retry'), run: retry }}
      reference={digest ? { label: text.getText('main', 'status.reference'), digest } : undefined}
    />
  );
}
