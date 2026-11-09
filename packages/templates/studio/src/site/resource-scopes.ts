import { defineScope } from '../infra/define-scope';

export const RESOURCE_SCOPES = Object.freeze({
  layout: defineScope({ id: 'layout', text: ['main'], config: ['app'], content: ['base'] }),
  metadata: defineScope({ id: 'metadata', text: ['main'], config: [], content: [] }),
});
export type ResourceScopeDefinition = (typeof RESOURCE_SCOPES)[keyof typeof RESOURCE_SCOPES];
export type ResourceScopeId = ResourceScopeDefinition['id'];
