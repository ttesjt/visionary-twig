import { Button } from '@frontend/ui';
import type { StudioPublishing } from '../../data/index.js';
import type { ProjectSession } from '../session/use-project-session.js';
import { useProjectPublishing } from './use-project-publishing.js';
import { useStudioTextCatalog } from '../text/context.js';
import { StudioPublishAction } from './publish-action.js';
export function ProjectPublishingControls({
  session,
  publishing,
}: {
  readonly session: ProjectSession;
  readonly publishing: StudioPublishing;
}) {
  const componentText = useStudioTextCatalog();
  const controls = useProjectPublishing(session, publishing);
  const status = {
    idle: '',
    loaded: componentText.publishLoaded,
    attached: componentText.publishAttached,
    published: componentText.publishSucceeded,
    conflict: componentText.publishConflict,
    'not-found': componentText.publishNotFound,
    invalid: componentText.publishInvalid,
    failed: componentText.publishFailed,
  };
  const locales = [
    ...new Set([session.project.metadata.defaultLocale, ...Object.keys(session.project.catalogs)]),
  ];
  return (
    <section className="ui-studio-publication" aria-label={componentText.publishTitle}>
      <h2>{componentText.publishTitle}</h2>
      <div className="ui-studio-actions">
        <label>
          {componentText.publishTarget}
          <select
            aria-label={componentText.publishTarget}
            disabled={controls.busy}
            value={controls.targetId}
            onChange={(event) => controls.setTargetId(event.target.value)}
          >
            {publishing.targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {componentText.publishKey}
          <input
            aria-label={componentText.publishKey}
            list="studio-publish-choices"
            disabled={controls.busy}
            value={controls.key}
            onChange={(event) => controls.setKey(event.target.value)}
          />
          <datalist id="studio-publish-choices">
            {controls.choices.map((choice) => (
              <option key={choice.key} value={choice.key}>
                {choice.label}
              </option>
            ))}
          </datalist>
        </label>
        <Button
          type="button"
          disabled={controls.busy || !controls.key.trim()}
          onClick={() => void controls.execute('load')}
        >
          {componentText.loadProject}
        </Button>
        <Button
          type="button"
          disabled={controls.busy || !controls.key.trim()}
          onClick={() => void controls.execute('inspect')}
        >
          {componentText.attachTarget}
        </Button>
      </div>
      <fieldset>
        <legend>{componentText.publishLanguages}</legend>
        {locales.map((locale) => (
          <label key={locale}>
            <input
              type="checkbox"
              disabled={controls.busy || locale === session.project.metadata.defaultLocale}
              checked={controls.locales.includes(locale)}
              onChange={(event) =>
                controls.setLocales(
                  event.target.checked
                    ? [...controls.locales, locale]
                    : controls.locales.filter((item) => item !== locale)
                )
              }
            />
            {locale}
          </label>
        ))}
      </fieldset>
      <StudioPublishAction
        busy={controls.busy}
        disabled={!controls.key.trim() || !session.flags.canSave}
        onPublish={() => void controls.execute('publish')}
        status={status[controls.status]}
        summary={
          <p>
            {publishing.targets.find((target) => target.id === controls.targetId)?.label} ·{' '}
            {controls.key} · {controls.locales.join(', ')}
          </p>
        }
      />
      <p>
        {componentText.targetVersion}: {controls.version}
      </p>
      {controls.detail && <p role="alert">{controls.detail}</p>}
    </section>
  );
}
