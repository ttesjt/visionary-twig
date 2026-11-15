import { defineScope } from '../infra/define-scope';

export const RESOURCE_SCOPES = Object.freeze({
  layout: defineScope({ id: 'layout', text: ['main'], config: ['app'], content: ['base'] }),
  metadata: defineScope({ id: 'metadata', text: ['main'], config: [], content: [] }),
  // The default main catalog is small. If it grows, give the 404 its own text namespace.
  notFound: defineScope({ id: 'not-found', text: ['main'], config: [], content: [] }),
  textDemo: defineScope({ id: 'text-demo', text: ['demo'], config: [], content: [] }),
  contentDemo: defineScope({
    id: 'content-demo',
    text: ['demo'],
    config: [],
    content: ['catalog'],
  }),
  makingNotes: defineScope({ id: 'making-notes', text: [], config: [], content: ['making-notes'] }),
});
export type ResourceScopeDefinition = (typeof RESOURCE_SCOPES)[keyof typeof RESOURCE_SCOPES];
export type ResourceScopeId = ResourceScopeDefinition['id'];
