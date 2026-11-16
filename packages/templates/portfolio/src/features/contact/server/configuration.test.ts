import { expect, it } from 'vitest';
import { contactConfiguration } from './configuration';

function incoming(origin: string, target = 'http://localhost:3100/api/contact'): Request {
  return new Request(target, { method: 'POST', headers: { origin } });
}

it('allows a matching loopback origin across aliases and rejects other origins', () => {
  expect(contactConfiguration(incoming('http://127.0.0.1:3100'), {})).toMatchObject({
    status: 'ready',
  });
  for (const origin of [
    'http://127.0.0.1:9999',
    'https://127.0.0.1:3100',
    'https://elsewhere.example.test',
  ])
    expect(contactConfiguration(incoming(origin), {})).toEqual({ status: 'invalid-origin' });
});

it('requires a configured deployment origin and addresses for live delivery', () => {
  const origin = 'https://portfolio.example.test';
  const request = incoming(origin, origin + '/api/contact');
  const configuration = {
    PORTFOLIO_CONTACT_DELIVERY: 'cloudflare',
    PORTFOLIO_CONTACT_ORIGIN: origin,
  };
  expect(contactConfiguration(request, configuration)).toEqual({ status: 'unavailable' });
  expect(
    contactConfiguration(request, {
      ...configuration,
      PORTFOLIO_CONTACT_FROM: 'site@example.test',
      PORTFOLIO_CONTACT_TO: 'owner@example.test',
    })
  ).toMatchObject({ status: 'ready' });
});
