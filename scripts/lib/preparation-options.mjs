import { parseOptions, TARGET_VALUES, TARGET_FLAGS } from '../workspace/options.mjs';
import { targetSelection } from '../workspace/targets.mjs';
export function preparationOptions(args) {
  const options = parseOptions(args, {
    values: [...TARGET_VALUES, '--kind', '--source'],
    flags: [...TARGET_FLAGS, '--check'],
  });
  const kind = options['--kind'] ?? 'app';
  if (!['text', 'config', 'content', 'app'].includes(kind))
    throw new Error('Expected text, config, content or app kind.');
  return {
    ...targetSelection(options),
    kind,
    source: options['--source'],
    check: !!options['--check'],
    help: !!options['--help'],
  };
}
