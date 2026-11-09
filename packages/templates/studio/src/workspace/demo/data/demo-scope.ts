import type { DemoImageAdapter } from '../adapters/contracts';
import type { DemoPageAdapter } from '../pages/contracts';
import type { DemoRecordStore } from '../adapters/contracts';
export interface DemoScope {
  readonly images: DemoImageAdapter;
  readonly records: DemoRecordStore;
  readonly pages: DemoPageAdapter;
  readonly createId: () => string;
  dispose(): void;
}
