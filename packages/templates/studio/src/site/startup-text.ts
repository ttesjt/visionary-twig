/** Offline initialization diagnostics must remain available when required dictionaries fail. */
export const RESOURCE_STARTUP_TEXT = Object.freeze({
  pending: 'Preparing resources…',
  failed: 'Resources could not be prepared',
  retry: 'Retry',
});

/** Last-resort text is synchronous and independent of dictionaries and Providers. */
export const GLOBAL_ERROR_TEXT = Object.freeze({
  locale: 'en',
  title: 'This page could not load',
  description: 'Something interrupted the site. Reload to try again, or return to the homepage.',
  home: 'Back to home',
  reload: 'Reload page',
  reference: 'Reference',
});
