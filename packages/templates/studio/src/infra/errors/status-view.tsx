export interface PageStatusText {
  readonly title: string;
  readonly description: string;
  readonly home: string;
}

/** Ready-to-display values only. This view also renders outside resource Providers. */
export function PageStatusView({
  text,
  homeHref,
  action,
  reference,
}: {
  readonly text: PageStatusText;
  readonly homeHref: string;
  readonly action?: { readonly label: string; readonly run: () => void } | undefined;
  readonly reference?: { readonly label: string; readonly digest: string } | undefined;
}) {
  return (
    <main className="ui-page-status">
      <h1>{text.title}</h1>
      <p className="ui-page-status-description">{text.description}</p>
      {reference && (
        <p className="ui-page-status-reference">
          {reference.label} <code>{reference.digest}</code>
        </p>
      )}
      <div className="ui-page-status-actions">
        {action && (
          <button type="button" className="ui-button" onClick={action.run}>
            {action.label}
          </button>
        )}
        <a href={homeHref}>{text.home}</a>
      </div>
    </main>
  );
}
