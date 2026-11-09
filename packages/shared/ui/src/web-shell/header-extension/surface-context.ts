import { createContext } from 'react';

/** Local surface readiness, including retained exit visuals; not page-owned state. */
export const HeaderExtensionSurfaceContext = createContext<boolean | null>(null);
