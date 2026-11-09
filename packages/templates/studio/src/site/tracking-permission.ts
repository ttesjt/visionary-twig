/**
 * The starter applies only the AppConfig switch. If your site also requires consent,
 * read its reactive consent state here and return true only while consent is granted. The preview request carries this decision too.
 */
export function useTrackingPermission(): boolean {
  return true;
}
