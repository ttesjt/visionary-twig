import 'server-only';
import { JsonResource } from '@frontend/prepared-data/resource';
import { jsonDefinition } from '../infra/resources';
import { readGeneratedJsonURL } from '../infra/resources/server';
import { configSchemas, type AppConfig } from './config-schema';

export async function readSiteAppConfig(): Promise<AppConfig> {
  const { url, version } = jsonDefinition('config', 'app');
  const value = await readGeneratedJsonURL(url);
  return new JsonResource(configSchemas, [{ namespace: 'app', version, value }])
    .createView()
    .get('app');
}
