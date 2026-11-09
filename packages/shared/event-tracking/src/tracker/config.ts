import type { ProjectConfig } from '../contracts.js';
export function copyProjects(
  projects: Readonly<Record<string, ProjectConfig>>
): ReadonlyMap<string, ProjectConfig> {
  const registry = new Map<string, ProjectConfig>();
  for (const [id, config] of Object.entries(projects)) {
    if (!id.trim() || !config || (config.url !== null && typeof config.url !== 'string'))
      throw new Error('Invalid event project configuration');
    if (config.url !== null) {
      const url = new URL(config.url);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
        throw new Error('Event URLs must be absolute HTTP(S) addresses without credentials');
    }
    if (config.validate !== undefined && typeof config.validate !== 'function')
      throw new Error('Invalid event validator');
    registry.set(id, Object.freeze({ ...config }));
  }
  return registry;
}
