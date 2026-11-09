import {
  discoverApps,
  discoverTemplateApps,
  selectApp,
  defaultApp,
} from '../../tooling/workspace-apps.ts';
export function selectTargets(root, options, { defaultAll = false } = {}) {
  if (options.app) return [selectApp(root, options.app)];
  if (options.all || defaultAll || options.includeTemplates)
    return [...discoverApps(root), ...(options.includeTemplates ? discoverTemplateApps(root) : [])];
  return [selectApp(root, defaultApp(root))];
}
export const targetSelection = (options) => ({
  app: options['--app'],
  all: !!options['--all'],
  includeTemplates: !!options['--include-templates'],
});
export function emptyAppsMessage() {
  return 'No application targets. Use template:clone to create an independent project, or explicitly include source templates with --include-templates.';
}
