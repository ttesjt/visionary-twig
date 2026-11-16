import { useText } from '../../../../infra/resources/client';
import type { ProjectRequestFailure } from './project-requests';

export function ProjectRegionError({
  region,
  code,
  retry,
}: {
  readonly region: 'categories' | 'list';
  readonly code: ProjectRequestFailure;
  readonly retry: () => void;
}) {
  const text = useText();
  const changed = code === 'source-changed';
  const message = changed
    ? 'projects.sourceChanged'
    : region === 'categories'
      ? 'projects.categoriesFailed'
      : 'projects.failed';
  return (
    <div className="ui-portfolio-project-error">
      <p role="status">{text.getText('main', message)}</p>
      <button type="button" onClick={changed ? () => window.location.reload() : retry}>
        {text.getText('main', changed ? 'projects.reload' : 'status.retry')}
      </button>
    </div>
  );
}
