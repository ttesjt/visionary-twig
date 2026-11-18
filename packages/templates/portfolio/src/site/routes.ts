export const SITE_ROUTES = { home: '/', about: '/about', projects: '/projects' } as const;
export const SITE_NAVIGATION_IDS = Object.keys(SITE_ROUTES) as (keyof typeof SITE_ROUTES)[];
