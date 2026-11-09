import type { ContentIssue } from '@frontend/ui-document';

export function StudioIssues({
  issues,
  label,
}: {
  readonly issues: readonly ContentIssue[];
  readonly label: string;
}) {
  if (!issues.length) return null;
  return (
    <section className="ui-studio-issues" role="alert" aria-label={label}>
      <h3>{label}</h3>
      <ul>
        {issues.map((issue, index) => (
          <li key={`${issue.code}:${index}`}>
            <strong>{issue.code}</strong> ·{' '}
            <code>{issue.path.length ? issue.path.join('.') : '$'}</code>
            {issue.documentId && <> · document: {issue.documentId}</>}
            {issue.nodeId && <> · node: {issue.nodeId}</>}
            <p>{issue.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
