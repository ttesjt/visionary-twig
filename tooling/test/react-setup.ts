import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { installDialogEnvironment } from './dialog-environment.js';
installDialogEnvironment();
afterEach(cleanup);
