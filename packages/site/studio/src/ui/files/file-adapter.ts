export interface StudioFileLocation {
  readonly name: string;
  write(this: void, text: string): Promise<void>;
}
export interface StudioFileSnapshot {
  readonly filename: string;
  readonly text: string;
}
export type StudioFileSaveResult =
  | { readonly status: 'saved'; readonly location: StudioFileLocation }
  | { readonly status: 'downloaded' | 'cancelled' };
export type StudioFileOpenResult =
  | {
      readonly status: 'opened';
      readonly filename: string;
      readonly text: string;
      readonly location: StudioFileLocation;
    }
  | { readonly status: 'cancelled' };
export interface StudioFileAdapter {
  open?(this: void): Promise<StudioFileOpenResult>;
  saveAs(this: void, snapshot: StudioFileSnapshot): Promise<StudioFileSaveResult>;
}
