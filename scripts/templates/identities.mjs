export const TEMPLATE_ID_PATTERN = /^[a-z][a-z0-9-]*$/u;
export const DEFAULT_APP_TEMPLATE = 'plain-next';
export const DEFAULT_LIBRARY_TEMPLATE = 'node-library';
export const DEFAULT_APP_NAME = 'web';
export const DEFAULT_PROJECT_NAME = '@frontend/starter';
export function packageScope(value) {
  const match = /^(@[a-z0-9][a-z0-9-]*)\/([a-z][a-z0-9-]*)$/u.exec(value);
  if (!match) throw new Error('Project name must be scoped, for example @example/frontend.');
  return match[1];
}
export function assertAppName(value) {
  if (typeof value !== 'string' || !TEMPLATE_ID_PATTERN.test(value))
    throw new Error('Invalid app destination ID.');
}
