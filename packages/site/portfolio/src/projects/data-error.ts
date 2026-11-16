export type PortfolioDataErrorCode =
  | 'invalid-project-row'
  | 'invalid-published-page'
  | 'invalid-migration-history'
  | 'project-not-found';

export class PortfolioDataError extends Error {
  constructor(
    readonly code: PortfolioDataErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'PortfolioDataError';
  }
}
