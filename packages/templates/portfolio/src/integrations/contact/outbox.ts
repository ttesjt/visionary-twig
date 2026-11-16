import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { EmailSender } from '@frontend/email';

export function createOutboxSender(directory = '.local/portfolio/outbox'): EmailSender {
  const outbox = resolve(/* turbopackIgnore: true */ directory);
  return {
    async send(message, signal) {
      signal?.throwIfAborted();
      await mkdir(outbox, { recursive: true, mode: 0o700 });
      const messageId = randomUUID();
      const target = resolve(outbox, messageId + '.json');
      const temporary = target + '.tmp';
      try {
        await writeFile(temporary, JSON.stringify(message, null, 2), {
          mode: 0o600,
          flag: 'wx',
          ...(signal ? { signal } : {}),
        });
        signal?.throwIfAborted();
        await rename(temporary, target);
        return { status: 'accepted', messageId };
      } finally {
        await rm(temporary, { force: true });
      }
    },
  };
}
