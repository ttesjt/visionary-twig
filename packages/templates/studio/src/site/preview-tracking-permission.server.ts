import 'server-only';

/** Called after the site switch and client grant. Hosts can additionally verify this request's consent cookie or session. */
export const hasPreviewTrackingPermission: (request: Request) => boolean | Promise<boolean> = () =>
  true;
