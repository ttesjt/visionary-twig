import type { ProjectCategory } from '@frontend/portfolio/contracts';
import { useText } from '../../../../infra/resources/client';
import type { ProjectLocation } from '../../project-location';
import { ProjectFilterView } from '../../components/project-views';
import { ProjectRegionError } from './project-region-error';
import { useProjectRegion, type ProjectRequest } from './project-region-state';
import { ProjectCategorySkeleton } from '../../components/project-skeleton';

export function ProjectCategoryRegion({
  request,
  source,
  location,
  hrefFor,
}: {
  readonly request: ProjectRequest<readonly ProjectCategory[]>;
  readonly source: string | undefined;
  readonly location: ProjectLocation;
  readonly hrefFor: (location: ProjectLocation) => string;
}) {
  const text = useText();
  const region = useProjectRegion(request, source);
  if (region.status === 'loading') {
    return <ProjectCategorySkeleton label={text.getText('main', 'projects.categoriesLoading')} />;
  }
  if (region.status === 'failed') {
    return <ProjectRegionError region="categories" code={region.code} retry={request.retry} />;
  }
  return <ProjectFilterView categories={region.data} location={location} hrefFor={hrefFor} />;
}
