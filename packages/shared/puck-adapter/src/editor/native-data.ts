import type { Data } from '@puckeditor/core';
import { walkTree } from '@puckeditor/core/rsc';
import { z } from 'zod';
import type { ContentData, ContentDocument, JsonObject } from '@frontend/ui-document';
import { serverConfig } from '../config/server-config.js';
import { toPuckData } from '../config/puck-data.js';

const jsonProps = z.record(z.string(), z.json());

export function previewPropsById(data: ContentData): ReadonlyMap<string, JsonObject> {
  const byId = new Map<string, JsonObject>();
  walkTree(toPuckData(data), serverConfig, (nodes) => {
    for (const node of nodes) {
      const value: unknown = node.props;
      byId.set(node.props.id, jsonProps.parse(value));
    }
  });
  return byId;
}

export function nodeIdAtZone(data: Data, zone: string, index: number): string | undefined {
  let found: string | undefined;
  walkTree(data, serverConfig, (nodes, { parentId, propName }) => {
    if (`${parentId}:${propName}` === zone) found = nodes[index]?.props.id;
  });
  return found;
}

/** Puck uses optional undefined bookkeeping and may add a reserved root ID.
 * Serialize its trusted editor state at this boundary; the content parser then
 * validates the complete JSON, node/slot contract and all user data as usual.
 */
export function normalizeEditorData(data: Data): unknown {
  const serialized: unknown = JSON.parse(JSON.stringify(data));
  return normalizePuckInput(serialized);
}

import { normalizePuckInput } from '../registry/normalize-puck-input.js';

/** Native canvas history does not own host-supplied variables, locale or revisions. */
export function restoreNativeHistory(
  current: ContentDocument,
  historical: ContentDocument
): ContentDocument {
  const { data, bindings, ...envelope } = current;
  void data;
  void bindings;
  return {
    ...envelope,
    data: historical.data,
    ...(historical.bindings === undefined ? {} : { bindings: historical.bindings }),
  };
}
