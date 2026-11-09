import { notFound } from 'next/navigation';
import { StudioPageOutlet } from '@frontend/studio/shell';
import { studioPageId, DEFAULT_STUDIO_PAGE } from '../../../../workspace/page-ids';
export default async function WorkspacePage({
  params,
}: {
  readonly params: Promise<{ pageId: string }>;
}) {
  const id = studioPageId((await params).pageId);
  if (!id || id === DEFAULT_STUDIO_PAGE) notFound();
  return <StudioPageOutlet />;
}
