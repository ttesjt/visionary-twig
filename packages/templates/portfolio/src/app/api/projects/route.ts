import { handleProjectList } from '../../../features/projects/sql/server';
import { portfolioData } from '../../../integrations/portfolio/runtime';
import { readSiteAppConfig } from '../../../site/app-config.server';
import { portfolioPageSize } from '../../../site/config-schema';

export async function GET(request: Request): Promise<Response> {
  return handleProjectList(request, portfolioData, portfolioPageSize(await readSiteAppConfig()));
}
