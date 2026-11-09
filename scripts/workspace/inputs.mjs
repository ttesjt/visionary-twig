import { existsSync, readFileSync } from 'node:fs';
import { PREPARED_INPUT_CAPABILITIES } from '../../tooling/workspace-apps.ts';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
/** Resolve every target before committing any app; each app retains its own transaction/lock. */
export async function prepareInputs(apps, { kind = 'app', check = false, source } = {}) {
  const targets = apps.filter((app) => {
    const file = path.join(app.directory, 'package.json');
    const manifest = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
    let found = false;
    for (const capability of PREPARED_INPUT_CAPABILITIES) {
      const present = existsSync(path.join(app.directory, capability.configuration));
      if (manifest[capability.flag] === true && !present)
        throw new Error(app.id + ': missing declared preparation ' + capability.configuration);
      found ||= present;
    }
    return found;
  });
  if (!targets.length) return;
  const {
    resolvePrepared,
    capturePreparedState,
    assertPreparedBasis,
    commitPrepared,
    checkPrepared,
    readPreparedSource,
    preparedSourceSchema,
    DEFAULT_PREPARED_SOURCE,
  } = await import('@frontend/prepared-data/node');
  const requested = source === undefined ? undefined : preparedSourceSchema.parse(source);
  const plans = [];
  for (const app of targets) {
    const load = async (name) =>
      (await import(pathToFileURL(path.join(app.directory, name)).href)).default;
    const definitions = {};
    const inheritedTextKeys = [];
    if (existsSync(path.join(app.directory, 'text-resources.config.ts'))) {
      const { textResourcesDefinition } = await import('@frontend/text-catalog/resource/node');
      const report = !check && (kind === 'text' || kind === 'app');
      definitions.text = textResourcesDefinition(
        await load('text-resources.config.ts'),
        report ? (entry) => inheritedTextKeys.push(entry) : undefined
      );
    }
    if (existsSync(path.join(app.directory, 'config.config.ts'))) {
      const { appConfigDefinition } = await import('@frontend/app-config/node');
      definitions.config = appConfigDefinition(await load('config.config.ts'));
    }
    if (existsSync(path.join(app.directory, 'content-resources.config.ts'))) {
      const { jsonResourcesDefinition } = await import('@frontend/prepared-data/resource/node');
      definitions.content = jsonResourcesDefinition({
        ...(await load('content-resources.config.ts')),
        kind: 'content',
      });
    }
    const inputs = existsSync(path.join(app.directory, 'app-inputs.config.ts'))
      ? await load('app-inputs.config.ts')
      : undefined;
    if (inputs?.prepared !== undefined) {
      if (!Array.isArray(inputs.prepared))
        throw new Error(app.id + ': prepared definitions must be an array.');
      for (const definition of inputs.prepared) {
        if (
          !definition ||
          typeof definition.namespace !== 'string' ||
          typeof definition.filename !== 'string' ||
          typeof definition.resolve !== 'function'
        )
          throw new Error(app.id + ': invalid prepared definition.');
        if (Object.hasOwn(definitions, definition.namespace))
          throw new Error(app.id + ': duplicate prepared namespace: ' + definition.namespace);
        Object.defineProperty(definitions, definition.namespace, {
          value: definition,
          enumerable: true,
        });
      }
    }
    const keys = Object.keys(definitions);
    if (!keys.length) continue;
    if (kind !== 'app' && !definitions[kind])
      throw new Error(app.id + ': does not declare ' + kind + ' preparation.');
    const expected = check
      ? undefined
      : await capturePreparedState(app.directory, Object.values(definitions));
    const resolved = {},
      sources = {};
    for (const key of keys) {
      const selected = kind === 'app' || kind === key;
      const hasManifest = existsSync(path.join(app.directory, '.generated', key, 'manifest.json'));
      const selectedSource =
        check || !selected
          ? hasManifest
            ? await readPreparedSource(app.directory, definitions[key])
            : DEFAULT_PREPARED_SOURCE
          : (requested ?? DEFAULT_PREPARED_SOURCE);
      if (check && selected) await checkPrepared(app.directory, definitions[key], requested);
      if (!check && !selected && hasManifest) await checkPrepared(app.directory, definitions[key]);
      resolved[key] = await resolvePrepared(app.directory, definitions[key], selectedSource);
      sources[key] = selectedSource;
    }
    if (expected)
      assertPreparedBasis(
        expected,
        keys.filter((key) => kind !== 'app' && key !== kind).map((key) => resolved[key])
      );
    if (inputs)
      await inputs.validate(resolved.text?.value, resolved.config?.value, resolved.content?.value);
    plans.push({
      app,
      inheritedTextKeys,
      expected,
      sources,
      artifacts: keys.filter((key) => kind === 'app' || key === kind).map((key) => resolved[key]),
    });
  }
  for (const plan of plans) {
    if (!check) {
      await commitPrepared(plan.app.directory, plan.artifacts, plan.expected);
      for (const { locale, namespace, referenceLocale, keys } of plan.inheritedTextKeys)
        console.log(
          `${plan.app.id}: ${locale}/${namespace} inherited from ${referenceLocale}: ${JSON.stringify(keys)}`
        );
    }
    console.log(
      plan.app.id +
        ': ' +
        kind +
        (check ? ' verified' : ' prepared') +
        ' (' +
        Object.entries(plan.sources)
          .map(([key, value]) => key + '=' + value)
          .join(', ') +
        ')'
    );
  }
}
