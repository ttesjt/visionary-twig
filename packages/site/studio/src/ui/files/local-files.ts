import { MAX_STUDIO_PROJECT_BYTES } from '../../data/index.js';
import type { ContentResult } from '@frontend/ui-document';
import { inputFailure } from '../session/document-input.js';

export async function readLocalJson(file: File): Promise<ContentResult<string>> {
  if (file.size > MAX_STUDIO_PROJECT_BYTES)
    return inputFailure('document-too-large', 'File exceeds the content byte limit.');
  try {
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_STUDIO_PROJECT_BYTES)
      return inputFailure('document-too-large', 'File exceeds the content byte limit.');
    try {
      return { ok: true, value: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
    } catch {
      return inputFailure('invalid-utf8', 'Choose a UTF-8 JSON file.');
    }
  } catch {
    return inputFailure('file-read-failed', 'The selected file could not be read.');
  }
}

export function jsonFilename(input: string, fallback = 'document'): string {
  const name = input
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .replace(/\.json$/i, '')
    .slice(0, 100);
  return `${name || fallback}.json`;
}
export interface StudioExportFile {
  readonly filename: string;
  readonly text: string;
}
/** Resolution means the host accepted this exact snapshot for download, not durable disk save. */
export type StudioExportAdapter = (file: StudioExportFile) => Promise<void>;

export const downloadJson: StudioExportAdapter = (file) => {
  const url = URL.createObjectURL(
    new Blob([file.text], { type: 'application/json;charset=utf-8' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = jsonFilename(file.filename);
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return Promise.resolve();
};
