import type { StudioSeed } from './content-schemas';
import { createBlobImageAdapter } from '../workspace/demo/adapters/blob-images';
import { createMemoryDemoAdapter } from '../workspace/demo/adapters/memory-data';
import { DEMO_RECORD_IDS } from '../workspace/demo/demo-record';
import type { DemoScope } from '../workspace/demo/data/demo-scope';
/** Default template integration. Replace these instances to use real image and record services. */
export function createDemoScope(demoRecords: StudioSeed): DemoScope {
  const data = createMemoryDemoAdapter(
    DEMO_RECORD_IDS.map((id) => ({
      id,
      title: demoRecords[id].title,
      summary: demoRecords[id].summary,
      status: 'draft',
    }))
  );
  const images = createBlobImageAdapter({
    create: (blob) => URL.createObjectURL(blob),
    revoke: (url) => URL.revokeObjectURL(url),
  });
  return { images, ...data, createId: () => crypto.randomUUID(), dispose: () => images.dispose() };
}
