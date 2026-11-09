'use client';
import '@frontend/ui/default.css';
import '@frontend/styles/default.css';
import { PageStatusView } from '../infra/errors/status-view';
import { errorDigest } from '../infra/errors/diagnostics';
import { GLOBAL_ERROR_TEXT } from '../site/startup-text';

export default function GlobalError({ error }: { readonly error: unknown }) {
  const digest = errorDigest(error);
  return (
    <html lang={GLOBAL_ERROR_TEXT.locale}>
      <head>
        <title>{GLOBAL_ERROR_TEXT.title}</title>
      </head>
      <body>
        <PageStatusView
          text={GLOBAL_ERROR_TEXT}
          homeHref="/"
          action={{ label: GLOBAL_ERROR_TEXT.reload, run: () => window.location.reload() }}
          reference={digest ? { label: GLOBAL_ERROR_TEXT.reference, digest } : undefined}
        />
      </body>
    </html>
  );
}
