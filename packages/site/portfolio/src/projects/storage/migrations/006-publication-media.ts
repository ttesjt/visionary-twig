import type { SqlCommand } from '@frontend/storage';

export const PUBLICATION_MEDIA_MIGRATION: readonly SqlCommand[] = [
  {
    sql: `CREATE TRIGGER IF NOT EXISTS portfolio_clear_replaced_page_media
    AFTER UPDATE OF revision, document_json, context_json ON portfolio_project_pages
    WHEN NEW.revision != OLD.revision
      OR NEW.document_json != OLD.document_json
      OR NEW.context_json != OLD.context_json
    BEGIN
      DELETE FROM portfolio_project_page_media
      WHERE project_id = OLD.project_id AND locale = OLD.locale;
    END`,
  },
];
