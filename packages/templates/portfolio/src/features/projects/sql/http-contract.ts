import { z } from 'zod';

export const PORTFOLIO_SOURCE_HEADER = 'X-Portfolio-Source';

export const portfolioFailureSchema = z.strictObject({
  code: z.enum(['invalid-query', 'source-changed', 'data-source-unavailable', 'invalid-data']),
});
export type PortfolioFailureCode = z.infer<typeof portfolioFailureSchema>['code'];
export type PortfolioRead<T> =
  | { readonly status: 'ready'; readonly source: string; readonly data: T }
  | { readonly status: 'failed'; readonly code: PortfolioFailureCode };
