'use client';
import { useState } from 'react';
import { studioHref } from '../../../navigation/studio-url';
import { StudioLink, useStudioRouteLocale } from '../../../navigation/studio-link';
import { useRouter } from 'next/navigation';
import { useStudioText } from '../../../../text/use-studio-text';
import { createDemoDraft, type DemoDraft } from '../../publishing/draft';
import { usePublishRecord } from '../../publishing/use-publish-record';
import { RecordValuesFields } from '../../forms/record-values-fields';
import { ImageInput } from '../../forms/image-input';
import { useFilePreview } from '../../forms/use-file-preview';
import { RecordPreview } from '../record-preview';
import { isDemoImageUrl } from '../../demo-record';
import { useDemoData } from '../../data/demo-provider';
import { DEMO_ROUTES } from '../../demo-routes';
export function DemoUploadPage() {
  const componentText = useStudioText().workspace.demo.upload;
  const [draft, setDraft] = useState<DemoDraft>(createDemoDraft);
  const router = useRouter();
  const locale = useStudioRouteLocale();
  const { select } = useDemoData();
  const publication = usePublishRecord((record) => {
    select(record.id);
    router.push(studioHref(DEMO_ROUTES.list, locale));
  });
  const fileUrl = useFilePreview(draft.image.mode === 'file' ? draft.image.file : null);
  const imageUrl =
    draft.image.mode === 'file'
      ? fileUrl
      : draft.image.mode === 'url' && isDemoImageUrl(draft.image.url.trim())
        ? draft.image.url.trim()
        : undefined;
  const busy = publication.state.status === 'publishing';
  const status =
    publication.state.status === 'publishing'
      ? componentText.stages[publication.state.stage]
      : publication.state.status === 'failed'
        ? componentText.failures[publication.state.stage]
        : publication.state.status === 'invalid'
          ? componentText.invalid
          : componentText.idle;
  return (
    <div className="ui-studio-upload-layout">
      <section className="ui-studio-surface ui-studio-flow" aria-label={componentText.title}>
        <div className="ui-studio-section-heading">
          <h2>{componentText.title}</h2>
        </div>
        <p>{componentText.description}</p>
        <form
          className="ui-studio-flow"
          onSubmit={(event) => {
            event.preventDefault();
            void publication.publish(draft);
          }}
        >
          <fieldset className="ui-studio-form-fields" disabled={busy}>
            <legend className="ui-studio-sr-only">{componentText.fields}</legend>
            <RecordValuesFields
              record={draft}
              onChange={(fields) => setDraft({ ...draft, ...fields })}
            />
            <ImageInput image={draft.image} onChange={(image) => setDraft({ ...draft, image })} />
          </fieldset>
          <div className="ui-studio-actions">
            <button
              className="ui-studio-button"
              data-variant="primary"
              type="submit"
              disabled={busy}
            >
              {componentText.publish}
            </button>
            <StudioLink className="ui-studio-button" href={DEMO_ROUTES.list}>
              {componentText.cancel}
            </StudioLink>
          </div>
          <p
            className="ui-studio-muted"
            role={
              publication.state.status === 'failed' || publication.state.status === 'invalid'
                ? 'alert'
                : 'status'
            }
          >
            {status}
          </p>
        </form>
      </section>
      <RecordPreview
        record={{
          id: 'preview',
          title: draft.title,
          summary: draft.summary,
          status: draft.status,
          ...(imageUrl ? { imageUrl } : {}),
        }}
      />
    </div>
  );
}
