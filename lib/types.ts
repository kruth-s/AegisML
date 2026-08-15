export interface ClipItem {
  id: string;
  content: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  language?: string;
}

export interface ClipboardRoom {
  slug: string;
  mainContent: string;
  snippets: ClipItem[];
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
