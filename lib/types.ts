export interface ClipItem {
  id: string;
  content: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  language?: string;
}

export interface FileItem {
  id: string;
  publicId: string;
  filename: string;
  url: string;
  secureUrl?: string;
  size: number;
  contentType?: string;
  createdAt: string;
}

export interface ClipboardRoom {
  slug: string;
  mainContent: string;
  snippets: ClipItem[];
  files?: FileItem[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  views?: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
