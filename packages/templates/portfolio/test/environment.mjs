import path from 'node:path';
import { randomUUID } from 'node:crypto';

/** Use disposable fixtures and never read a developer's live adapter settings. */
export function environment({ environment, root }) {
  const data = path.join(root, 'test-results', 'portfolio-fixtures', randomUUID());
  return {
    ...environment,
    SITE_URL: 'https://site.example.test',
    PORTFOLIO_DATA_SOURCE: 'local',
    PORTFOLIO_LOCAL_DIR: data,
    PORTFOLIO_CONTACT_DELIVERY: 'local',
    PORTFOLIO_CONTACT_OUTBOX: path.join(data, 'outbox'),
    PORTFOLIO_CONTACT_ORIGIN: '',
    PORTFOLIO_CONTACT_FROM: 'portfolio@example.test',
    PORTFOLIO_CONTACT_TO: 'outbox@example.test',
  };
}
