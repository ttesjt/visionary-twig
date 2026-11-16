import { projectCategorySchema, projectListSchema } from '@frontend/portfolio/contracts';
import { z } from 'zod';
import {
  PORTFOLIO_SOURCE_HEADER,
  portfolioFailureSchema,
  type PortfolioFailureCode,
} from '../http-contract';

const PROJECT_QUERY_TIMEOUT_MS = 10_000;
const categoriesSchema = z.array(projectCategorySchema).readonly();

export type ProjectRequestFailure =
  PortfolioFailureCode | 'network' | 'timeout' | 'invalid-response';

export class ProjectRequestError extends Error {
  constructor(
    readonly code: ProjectRequestFailure,
    options?: ErrorOptions
  ) {
    super('Portfolio request failed: ' + code, options);
  }
}

export interface ProjectResponse<T> {
  readonly source: string;
  readonly data: T;
}

async function readProjectResource<T>(
  schema: z.ZodType<T>,
  url: string,
  expectedSource?: string
): Promise<ProjectResponse<T>> {
  const signal = AbortSignal.timeout(PROJECT_QUERY_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal,
      ...(expectedSource ? { headers: { [PORTFOLIO_SOURCE_HEADER]: expectedSource } } : {}),
    });
    const json: unknown = await response.json().catch((error: unknown) => {
      if (signal.aborted) throw error;
      throw new ProjectRequestError('invalid-response', { cause: error });
    });
    if (!response.ok) {
      const failure = portfolioFailureSchema.safeParse(json);
      throw new ProjectRequestError(failure.success ? failure.data.code : 'invalid-response');
    }
    const source = response.headers.get(PORTFOLIO_SOURCE_HEADER);
    if (!source) throw new ProjectRequestError('invalid-response');
    if (expectedSource && source !== expectedSource)
      throw new ProjectRequestError('source-changed');
    const data = schema.safeParse(json);
    if (!data.success) throw new ProjectRequestError('invalid-response', { cause: data.error });
    return { source, data: data.data };
  } catch (error) {
    if (error instanceof ProjectRequestError) throw error;
    throw new ProjectRequestError(signal.aborted ? 'timeout' : 'network', { cause: error });
  }
}

export function readProjects(url: string, source?: string) {
  return readProjectResource(projectListSchema, url, source);
}

export function readProjectCategories(url: string, source?: string) {
  return readProjectResource(categoriesSchema, url, source);
}
