export interface UploadedFileMeta {
  fileId: string;
  displayName: string;
  fileName?: string;
  mimeType?: string;
  storagePath?: string;
  storageUri?: string;
  downloadUrl?: string;
  checksum?: string;
  sizeBytes?: number;
  uploader?: string;
  teamId?: string;
  runId?: string;
  visibility?: string;
  extra?: Record<string, unknown>;
}

export interface AttachmentItem extends UploadedFileMeta {
  status?: 'uploading' | 'ready' | 'error';
  errorMessage?: string;
}
