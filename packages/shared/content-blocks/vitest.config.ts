import { mergeConfig } from 'vitest/config';
import base from '../../../vitest.config.react.js';
export default mergeConfig(base, { test: { setupFiles: ['./test/browser-observers.ts'] } });
