import path from 'node:path';
export function cloneOptions(args) {
  const options = { appNames: {}, install: true, verify: true, offline: false, browser: false };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag !== '--app' && seen.has(flag)) throw new Error('Repeated clone option: ' + flag);
    seen.add(flag);
    if (['--output', '--name', '--templates', '--app'].includes(flag)) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error('Missing value for ' + flag);
      if (flag === '--output') options.destination = path.resolve(value);
      if (flag === '--name') options.name = value;
      if (flag === '--templates') options.templates = value.split(',');
      if (flag === '--app') {
        const [id, name, extra] = value.split('=');
        if (!id || !name || extra || options.appNames[id])
          throw new Error('Expected a distinct --app template-id=app-id.');
        options.appNames[id] = name;
      }
    } else if (flag === '--no-install') {
      options.install = false;
      options.verify = false;
    } else if (flag === '--no-verify') options.verify = false;
    else if (flag === '--offline') options.offline = true;
    else if (flag === '--browser') options.browser = true;
    else if (flag === '--help' || flag === '--list') options[flag.slice(2)] = true;
    else throw new Error('Unknown clone option: ' + flag);
  }
  if (options.browser && !options.verify)
    throw new Error('--browser needs installation and verification.');
  if (!options.destination && !options.help && !options.list)
    throw new Error('Specify --output <new-directory>.');
  return options;
}
