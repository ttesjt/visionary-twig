import { emailAddressSchema } from '@frontend/email';
import { z } from 'zod';
import { metadataOriginSchema } from '../../../infra/metadata-schema';

const contactEnvironmentSchema = z.object({
  PORTFOLIO_CONTACT_DELIVERY: z.enum(['local', 'cloudflare', 'disabled']).default('local'),
  PORTFOLIO_CONTACT_ORIGIN: metadataOriginSchema.optional(),
  PORTFOLIO_CONTACT_FROM: emailAddressSchema.optional(),
  PORTFOLIO_CONTACT_TO: emailAddressSchema.optional(),
});
const LOCAL_FROM = 'portfolio@example.test';
const LOCAL_TO = 'outbox@example.test';
const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export function contactConfiguration(
  request: Request,
  environment: Readonly<Record<string, string | undefined>>
) {
  const configured = contactEnvironmentSchema.safeParse({
    ...environment,
    PORTFOLIO_CONTACT_ORIGIN: environment.PORTFOLIO_CONTACT_ORIGIN || undefined,
  });
  if (!configured.success || configured.data.PORTFOLIO_CONTACT_DELIVERY === 'disabled')
    return { status: 'unavailable' } as const;
  const {
    PORTFOLIO_CONTACT_DELIVERY: delivery,
    PORTFOLIO_CONTACT_ORIGIN: origin,
    PORTFOLIO_CONTACT_FROM: from,
    PORTFOLIO_CONTACT_TO: to,
  } = configured.data;
  if (delivery === 'cloudflare' && (!origin || !from || !to))
    return { status: 'unavailable' } as const;
  if (!matchesContactOrigin(request, origin)) return { status: 'invalid-origin' } as const;
  return { status: 'ready', from: from ?? LOCAL_FROM, to: to ?? LOCAL_TO } as const;
}

function matchesContactOrigin(request: Request, configuredOrigin: string | undefined): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  if (configuredOrigin) return origin === new URL(configuredOrigin).origin;

  // Next may represent a local request using a different loopback alias.
  // Scheme and port still need to match the server receiving the request.
  const target = new URL(request.url);
  if (!loopbackHosts.has(target.hostname) || !URL.canParse(origin)) return false;
  const caller = new URL(origin);
  return (
    caller.origin === origin &&
    loopbackHosts.has(caller.hostname) &&
    caller.protocol === target.protocol &&
    caller.port === target.port
  );
}
