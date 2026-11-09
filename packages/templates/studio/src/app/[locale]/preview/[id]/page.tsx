import { RESOURCE_SCOPES } from '../../../../infra/resources';
import { resourceRouteLocale, serverText } from '../../../../infra/resources/server';
import { StudioIssues } from '@frontend/studio/issues';
import { ContentRender } from '@frontend/puck-adapter';
import { resolveDocument } from '@frontend/ui-document';
import { contentRegistry } from '@frontend/puck-adapter/schema';
import { resolveThemePreference } from '@frontend/ui/theme';
import { getThemePolicy } from '../../../../site/theme-policy';
import { previewStore } from '../../../../preview/preview-server';
import { PREVIEW_ID_PATTERN } from '../../../../preview/preview-policy';
import '@/styles/preview.css';
import '@frontend/styles/studio-preview.css';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export default async function PreviewPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ id: string; locale: string }>;
  readonly searchParams: Promise<{ theme?: string }>;
}) {
  const text = await serverText(await resourceRouteLocale(params), RESOURCE_SCOPES.metadata);
  const { id } = await params;
  const { theme } = await searchParams;
  const snapshot = PREVIEW_ID_PATTERN.test(id) ? previewStore.get(id) : undefined;
  const resolved = snapshot
    ? resolveDocument(snapshot.document, contentRegistry, { context: snapshot.context })
    : undefined;
  return (
    <main
      className="ui-studio-preview-page"
      data-theme={resolveThemePreference(getThemePolicy(), theme)}
    >
      {!snapshot ? (
        <section role="status">
          <h1>{text.getText('main', 'host.previewUnavailable')}</h1>
          <p>{text.getText('main', 'host.previewExpired')}</p>
        </section>
      ) : resolved?.ok ? (
        <ContentRender document={snapshot.document} context={snapshot.context} />
      ) : (
        <StudioIssues
          issues={resolved && !resolved.ok ? resolved.errors : []}
          label={text.getText('main', 'host.previewIssues')}
        />
      )}
    </main>
  );
}
