import { handleProjectMedia } from '../../../../../features/projects/sql/server';
import { portfolioData } from '../../../../../integrations/portfolio/runtime';

export function GET(
  request: Request,
  { params }: { readonly params: Promise<{ readonly projectId: string }> }
): Promise<Response> {
  return handleProjectMedia(request, params, portfolioData);
}
