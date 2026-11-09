import path from 'node:path';
import { appPlaywrightConfig } from '../../../tooling/playwright-app';
export default appPlaywrightConfig(
  path.resolve(import.meta.dirname, '../../..'),
  'template-studio'
);
