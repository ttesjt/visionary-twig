import { defineConfig, mergeConfig } from 'vitest/config';
import base from '../../../vitest.config.react.js';
export default mergeConfig(
  base,
  defineConfig({
    test: {
      include: [
        '{src,test}/**/*.{test,spec}.{ts,tsx,mts,cts}',
        'template/test/**/*.{test,spec}.{ts,tsx,mts,cts}',
      ],
    },
  })
);
