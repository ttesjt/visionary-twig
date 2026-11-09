/** Verification never reads a developer's real deployment origin. */
export function environment(context) {
  return { ...context.environment, SITE_URL: 'https://studio.example.test' };
}
