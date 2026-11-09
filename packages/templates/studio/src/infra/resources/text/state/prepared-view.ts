import type { PreparedResources, ResourcePlan } from '@frontend/resource-runtime';
import type {
  TextReadView,
  TextViewDictionary,
  TextResourceOptions,
} from '@frontend/text-catalog/resource';
import { TextResource } from '@frontend/text-catalog/resource';
import {
  namespaceRegistry,
  textLocale,
  isTextNamespace,
  type TextNamespaces,
} from '../planning/registry';

/** Pure construction: the local container owns all dictionaries in this prepared plan. */
export function createPreparedTextResource(
  prepared: PreparedResources,
  plan: ResourcePlan,
  options: TextResourceOptions = {}
): TextResource<TextNamespaces> {
  if (prepared.planKey !== plan.key) throw new Error('Text preparation plan mismatch.');
  const locale = textLocale(prepared.context.locale);
  const dictionaries: TextViewDictionary<TextNamespaces>[] = plan.resources.map((definition) => {
    const namespace = definition.id;
    if (!isTextNamespace(namespace)) throw new Error(`Unknown namespace: ${namespace}`);
    const entry = prepared.resources.find((value) => value.key === definition.key);
    if (!entry) throw new Error(`Missing prepared namespace: ${namespace}`);
    return { namespace, dictionary: entry.value, version: definition.version };
  });
  return new TextResource(namespaceRegistry, [{ locale, dictionaries }], options);
}

export function createPreparedTextView(
  prepared: PreparedResources,
  plan: ResourcePlan,
  parent?: TextReadView<TextNamespaces>
): TextReadView<TextNamespaces> {
  return createPreparedTextResource(prepared, plan).createView(
    textLocale(prepared.context.locale),
    parent ? { parent } : {}
  );
}
