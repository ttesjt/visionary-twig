import { jsonResourcesDefinition } from '@frontend/prepared-data/resource/node';
import { z } from 'zod';
import {
  prepareData,
  resolvePreparedJson,
  checkPrepared,
  type PreparedSource,
  type PreparedDefinition,
} from '@frontend/prepared-data/node';
export const appConfigurationSchema = z.strictObject({
  version: z.number().int().positive(),
  schema: z.instanceof(z.ZodType),
});
export type AppConfiguration = z.infer<typeof appConfigurationSchema>;
export function appConfigDefinition(configuration: unknown): PreparedDefinition {
  if (typeof configuration === 'object' && configuration !== null && 'resources' in configuration)
    return jsonResourcesDefinition({ ...configuration, kind: 'config' });
  const config = appConfigurationSchema.parse(configuration);
  return {
    namespace: 'config',
    filename: 'app.json',
    contractVersion: config.version,
    async resolve(read, source) {
      return resolvePreparedJson(read, source, {
        defaults: 'config/default/app.json',
        custom: '.local/config/app.json',
        parse: (value) => config.schema.parse(value),
      });
    },
  };
}
export const prepareAppConfig = (app: string, configuration: unknown, source?: PreparedSource) =>
  prepareData(app, appConfigDefinition(configuration), source);
export const checkPreparedAppConfig = (
  app: string,
  configuration: unknown,
  source?: PreparedSource
) => checkPrepared(app, appConfigDefinition(configuration), source);
