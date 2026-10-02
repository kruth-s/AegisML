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

export interface DevicePresence {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  color: string;
  lastSeen: number;
  isSelf?: boolean;
  ip?: string;
  city?: string;
  country?: string;
  countryFlag?: string;
  region?: string;
  isSameNetwork?: boolean;
  screenResolution?: string;
  battery?: string;
  connectionType?: string;
}

export interface EnvVariable {
  key: string;
  value: string;
  isSecret: boolean;
  comment?: string;
  rawLine: string;
}

export interface ClipboardRoom {
  slug: string;
  mainContent: string;
  snippets: ClipItem[];
  files?: FileItem[];
  activeDevices?: DevicePresence[];
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

