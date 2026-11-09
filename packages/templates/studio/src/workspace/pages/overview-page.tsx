'use client';
import { useAppConfig } from '../../infra/resources/client';
import { StudioIcon, type StudioPageContext } from '@frontend/studio/shell';
import { useStudioText } from '../../text/use-studio-text';
import { StudioLink } from '../navigation/studio-link';
import { STUDIO_PAGES } from '../page-ids';
import { DEMO_ROUTES } from '../demo/demo-routes';
export function OverviewPage({ navigate }: StudioPageContext) {
  const config = useAppConfig().get('app');
  const componentText = useStudioText().workspace.overview;
  return (
    <div className="ui-studio-flow">
      <section className="ui-studio-surface ui-studio-flow">
        <div className="ui-studio-section-heading">
          <h2>{componentText.title}</h2>
        </div>
        {config.workspace.showIntroduction && <p>{componentText.body}</p>}
      </section>
      <div className="ui-studio-grid">
        <section className="ui-studio-surface ui-studio-flow">
          <div className="ui-studio-section-heading">
            <h2>{componentText.demoTitle}</h2>
          </div>
          <p>{componentText.demoBody}</p>
          <div>
            <button
              className="ui-studio-button"
              type="button"
              onClick={() => navigate(STUDIO_PAGES.demo)}
            >
              {componentText.openDemo}
              <StudioIcon name="arrow" />
            </button>
          </div>
        </section>
        <section className="ui-studio-surface ui-studio-flow">
          <div className="ui-studio-section-heading">
            <h2>{componentText.editorTitle}</h2>
          </div>
          <p>{componentText.editorBody}</p>
          <div>
            <StudioLink className="ui-studio-button" href={DEMO_ROUTES.pages}>
              {componentText.openEditor}
              <StudioIcon name="arrow" />
            </StudioLink>
          </div>
        </section>
      </div>
    </div>
  );
}
