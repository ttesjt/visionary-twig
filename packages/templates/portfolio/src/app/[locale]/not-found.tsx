'use client';
import { PageStatusView } from '../../infra/errors/status-view';
import { useText } from '../../infra/resources/client';
import { localeHref } from '../../infra/resources/routing';

export default function NotFound() {
  const text = useText();
  return (
    <PageStatusView
      homeHref={localeHref('/', text.locale)}
      text={{
        title: text.getText('main', 'status.notFound.title'),
        description: text.getText('main', 'status.notFound.description'),
        home: text.getText('main', 'status.home'),
      }}
    />
  );
}
