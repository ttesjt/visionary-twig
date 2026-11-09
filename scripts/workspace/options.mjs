/** Shared strict option parser: command modules declare only capabilities they support. */
export function parseOptions(args, { values = [], flags = [] } = {}) {
  const result = {};
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (Object.hasOwn(result, key)) throw new Error('Repeated option: ' + key);
    if (flags.includes(key)) result[key] = true;
    else if (values.includes(key)) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error('Expected a value for ' + key);
      result[key] = value;
    } else throw new Error('Unknown option: ' + key);
  }
  if (result['--app'] && !/^[a-z][a-z0-9-]*$/.test(result['--app']))
    throw new Error('Expected an app directory ID.');
  if (result['--app'] && result['--all']) throw new Error('--app cannot be combined with --all.');
  if (result['--app'] && result['--include-templates'])
    throw new Error(
      '--app cannot be combined with --include-templates; select the template ID explicitly.'
    );
  return result;
}
export const TARGET_VALUES = ['--app'];
export const TARGET_FLAGS = ['--all', '--include-templates', '--help'];
