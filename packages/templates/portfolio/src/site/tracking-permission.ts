/**
 * The starter applies only the AppConfig switch. If your site also requires consent,
 * read its reactive consent state here and return true only while consent is granted.
 */
export function useTrackingPermission(): boolean {
  return true;
}
