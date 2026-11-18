import { createHash, randomUUID } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import type { StorageConnection } from '@frontend/storage';

type SourceConfiguration =
  | {
      readonly kind: 'local';
      readonly paths: { readonly filename: string; readonly mediaDirectory: string };
    }
  | { readonly kind: 'cloudflare'; readonly configPath: string };

export interface NodePortfolioSource {
  readonly id: string;
  open(): Promise<StorageConnection>;
}

export function createNodePortfolioSource({
  configuration,
  openLocal,
  openCloud,
}: {
  readonly configuration: () => SourceConfiguration;
  readonly openLocal: (
    paths: Extract<SourceConfiguration, { kind: 'local' }>['paths']
  ) => Promise<StorageConnection>;
  readonly openCloud: (configPath: string) => Promise<StorageConnection>;
}): () => Promise<NodePortfolioSource> {
  let snapshot: Promise<NodePortfolioSource> | undefined;
  return () => {
    snapshot ??= Promise.resolve()
      .then(async () => {
        const config = configuration();
        if (config.kind === 'local') {
          return { id: sourceId(config), open: () => openLocal(config.paths) };
        }
        const contents = await readFile(config.configPath);
        return {
          id: sourceId(config, contents),
          open: async () => {
            // Relative Wrangler paths still resolve against the original directory.
            const copy = join(
              dirname(config.configPath),
              '.portfolio-source-' + randomUUID() + extname(config.configPath)
            );
            await writeFile(copy, contents, { flag: 'wx', mode: 0o600 });
            try {
              return await openCloud(copy);
            } finally {
              await unlink(copy);
            }
          },
        };
      })
      .catch((error: unknown) => {
        snapshot = undefined;
        throw error;
      });
    return snapshot;
  };
}

function sourceId(configuration: SourceConfiguration, contents?: Uint8Array): string {
  const hash = createHash('sha256').update(JSON.stringify(configuration));
  if (contents) hash.update(contents);
  return hash.digest('hex');
}
