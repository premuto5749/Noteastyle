export interface CapturedMedia {
  blob: Blob;
  type: "photo" | "video";
  thumbnailBlob?: Blob;
  durationSeconds?: number;
  previewUrl: string;
  thumbnailUrl?: string;
  photoType: string; // "before" | "during" | "after"
}
