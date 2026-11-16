import { handleProjectCategories } from '../../../../features/projects/sql/server';
import { portfolioData } from '../../../../integrations/portfolio/runtime';

export function GET(request: Request): Promise<Response> {
  return handleProjectCategories(request, portfolioData);
}
