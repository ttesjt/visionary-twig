import { downloadJson } from './local-files.js';
import { readLocalJson } from './local-files.js';
import type { StudioFileAdapter, StudioFileLocation } from './file-adapter.js';
import type { StudioExportAdapter } from './local-files.js';
interface FilePickerOptions {
  readonly multiple?: boolean;
  readonly suggestedName?: string;
  readonly types: readonly {
    readonly description: string;
    readonly accept: Readonly<Record<string, readonly string[]>>;
  }[];
}
declare global {
  interface Window {
    showOpenFilePicker?: (options: FilePickerOptions) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (options: FilePickerOptions) => Promise<FileSystemFileHandle>;
  }
}
const FILE_TYPES = [{ description: 'Studio JSON', accept: { 'application/json': ['.json'] } }];
const cancelled = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';
function fileLocation(handle: FileSystemFileHandle): StudioFileLocation {
  return {
    name: handle.name,
    async write(text) {
      const stream = await handle.createWritable();
      try {
        await stream.write(text);
        await stream.close();
      } catch (error) {
        await stream.abort().catch(() => {});
        throw error;
      }
    },
  };
}
export function createBrowserFileAdapter(
  exportFile: StudioExportAdapter = downloadJson
): StudioFileAdapter {
  return {
    ...(typeof window !== 'undefined' && window.showOpenFilePicker
      ? {
          async open() {
            try {
              const handle = (
                await window.showOpenFilePicker?.({ types: FILE_TYPES, multiple: false })
              )?.[0];
              if (!handle) return { status: 'cancelled' as const };
              const file = await handle.getFile();
              const result = await readLocalJson(file);
              if (!result.ok)
                throw new Error(result.errors.map((issue) => issue.message).join('; '));
              return {
                status: 'opened' as const,
                filename: file.name,
                text: result.value,
                location: fileLocation(handle),
              };
            } catch (error) {
              if (cancelled(error)) return { status: 'cancelled' as const };
              throw error;
            }
          },
        }
      : {}),
    async saveAs(snapshot) {
      if (
        typeof window !== 'undefined' &&
        window.showSaveFilePicker &&
        exportFile === downloadJson
      ) {
        try {
          const handle = await window.showSaveFilePicker({
            types: FILE_TYPES,
            suggestedName: snapshot.filename,
          });
          const location = fileLocation(handle);
          await location.write(snapshot.text);
          return { status: 'saved', location };
        } catch (error) {
          if (cancelled(error)) return { status: 'cancelled' };
          throw error;
        }
      }
      await exportFile(snapshot);
      return { status: 'downloaded' };
    },
  };
}
