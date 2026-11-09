export const SINGLE_TARGET_HELP =
  '--app <directory-id> selects one app (template IDs: template-<id>).';
export const TARGET_HELP =
  SINGLE_TARGET_HELP + ' --all selects apps; --include-templates also includes source templates.';
export const PREPARE_HELP =
  '--source auto (default) merges existing optional overrides; default ignores overrides; custom requires all overrides. Builds selected dependencies and writes only .generated inputs, never .local, SQL or cloud storage.';
export function commandHelp(command, extra = '', { batch = true } = {}) {
  console.log(
    'pnpm ' + command + ' [options]\n' + (batch ? TARGET_HELP : SINGLE_TARGET_HELP) + '\n' + extra
  );
}
