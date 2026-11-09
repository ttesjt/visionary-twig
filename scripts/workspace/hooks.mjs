import path from 'node:path';
import { pathToFileURL } from 'node:url';
/** App-owned hooks supply data/test environments; reusable runners have no provider or app IDs. */
export async function appEnvironment(root, app, kind, context) {
  const file = app[kind === 'dev' ? 'devHook' : 'testHook'];
  if (!file) {
    if (context.data || context.productionDefaults)
      throw new Error(app.id + ': requested ' + kind + ' capability is not declared.');
    return { ...context.environment };
  }
  const hook = await import(pathToFileURL(path.resolve(app.directory, file)).href);
  if (typeof hook.environment !== 'function')
    throw new Error(app.id + ': hook must export environment(context).');
  const result = await hook.environment({
    root,
    app,
    ...context,
    environment: { ...context.environment },
  });
  if (
    !result ||
    typeof result !== 'object' ||
    Array.isArray(result) ||
    Object.values(result).some((value) => value !== undefined && typeof value !== 'string')
  )
    throw new Error(app.id + ': hook returned an invalid process environment.');
  return result;
}
