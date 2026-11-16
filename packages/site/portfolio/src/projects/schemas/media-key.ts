import { assertObjectKey } from '@frontend/storage';
import { z } from 'zod';

export const projectMediaKeySchema = z.string().refine((key) => {
  try {
    assertObjectKey(key);
    return true;
  } catch {
    return false;
  }
}, 'Expected a valid storage object key.');
