import { z } from 'zod';
import { assertSafeData, freezePreparedData } from '@frontend/prepared-data';
import { parseTextTemplate } from '../../catalog/template.js';
import type { TextNamespaceContract } from './types.js';
import { namespaceContractSchema } from './schema.js';
const dictionarySchema = z.record(z.string().min(1), z.string()).readonly();
export type TextDictionary = z.output<typeof dictionarySchema>;
export type CompiledText = ReturnType<typeof parseTextTemplate>;
export interface ParsedTextDictionary {
  readonly dictionary: TextDictionary;
  readonly templates: ReadonlyMap<string, CompiledText>;
}
function flatDictionary(input: unknown): TextDictionary {
  assertSafeData(input);
  return dictionarySchema.parse(input);
}
/** Defaults alone define allowed keys and variables; no schema/key list is hand-authored. */
export function deriveTextContract(input: unknown): TextNamespaceContract {
  const dictionary = flatDictionary(input);
  const keys: z.output<typeof namespaceContractSchema> = {};
  for (const key of Object.keys(dictionary).sort()) {
    const names = new Set<string>();
    for (const part of parseTextTemplate(dictionary[key] ?? ''))
      if (part.kind === 'variable') names.add(part.name);
    keys[key] = Object.fromEntries([...names].sort().map((name) => [name, true]));
  }
  freezePreparedData(keys);
  return keys;
}
/** Exact flat keys, ordinary dots, and allowed placeholders. Compile once per installation. */
export function parseTextDictionary(
  contract: TextNamespaceContract,
  input: unknown,
  completeness: 'complete' | 'partial' = 'complete'
): ParsedTextDictionary {
  assertSafeData(contract);
  namespaceContractSchema.parse(contract);
  const dictionary = flatDictionary(input);
  if (completeness === 'complete') {
    const missing = Object.keys(contract).filter((key) => !Object.hasOwn(dictionary, key));
    if (missing.length) throw new Error('Missing text keys: ' + missing.join(', '));
  }
  const templates = new Map<string, CompiledText>();
  for (const [key, value] of Object.entries(dictionary)) {
    const allowed = contract[key];
    if (!Object.hasOwn(contract, key) || !allowed) throw new Error('Unknown text key: ' + key);
    const parts = parseTextTemplate(value);
    for (const part of parts)
      if (part.kind === 'variable' && !Object.hasOwn(allowed, part.name))
        throw new Error(`Unknown text variable at ${key}: ${part.name}`);
    freezePreparedData(parts);
    templates.set(key, parts);
  }
  freezePreparedData(dictionary);
  return { dictionary, templates };
}
export function parseTextNamespace(
  contract: TextNamespaceContract,
  input: unknown
): TextDictionary {
  return parseTextDictionary(contract, input).dictionary;
}
