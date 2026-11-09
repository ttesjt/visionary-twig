import type { ProjectIssue } from '../../data/index.js';
import { useStudioTextCatalog } from '../text/context.js';
/** Keeps language, variable source and target details visible in every editing surface. */
export function StudioProjectIssues({
  issues,
  announce = false,
}: {
  readonly issues: readonly ProjectIssue[];
  readonly announce?: boolean;
}) {
  const componentText = useStudioTextCatalog();
  if (!issues.length) return null;
  return (
    <section
      className="ui-studio-dependencies"
      aria-label={componentText.missingDependencies}
      role={announce ? 'alert' : undefined}
    >
      <h2>{componentText.missingDependencies}</h2>
      <ul>
        {issues.map((issue, index) => (
          <li key={index}>
            <strong>{issue.code}</strong> · {issue.locale} ·{' '}
            {issue.sourceKind === 'catalog'
              ? componentText.catalogSource
              : componentText.generalContext}{' '}
            · {issue.nodeId} {(issue.targetPath ?? issue.path).join('.')} ·{' '}
            {issue.sourcePath?.join('.')} — {issue.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
