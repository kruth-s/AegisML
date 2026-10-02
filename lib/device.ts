import { DevicePresence } from './types';

const VIBRANT_COLORS = [
  '#ff5a1f', // Brand Neon Orange
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
];

export function getClientDeviceInfo(): Omit<DevicePresence, 'lastSeen'> {
  if (typeof window === 'undefined') {
    return {
      deviceId: 'server',
      deviceName: 'Server',
      deviceType: 'desktop',
      browser: 'Unknown',
      os: 'Unknown',
      color: '#ff5a1f',
    };
  }

  // Persistent Device ID in sessionStorage (per browser session/tab instance)
  let deviceId = sessionStorage.getItem('the_drop_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem('the_drop_device_id', deviceId);
  }

  // Persistent Color per device
  let color = sessionStorage.getItem('the_drop_device_color');
  if (!color) {
    color = VIBRANT_COLORS[Math.floor(Math.random() * VIBRANT_COLORS.length)];
    sessionStorage.setItem('the_drop_device_color', color);
  }

  const ua = navigator.userAgent;

  // OS Detection
  let os = 'Unknown OS';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';

  // Device Type Detection
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk)/i.test(ua);
  const isMobile = /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua);

  if (isTablet) {
    deviceType = 'tablet';
  } else if (isMobile || (window.innerWidth < 640 && 'ontouchstart' in window)) {
    deviceType = 'mobile';
  }

  // Browser Detection
  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Opera|OPR\//i.test(ua)) browser = 'Opera';

  // Formatted Device Name
  let deviceName = `${os} (${browser})`;
  if (deviceType === 'mobile') {
    deviceName = os === 'iOS' ? `iPhone (${browser})` : `Phone (${browser})`;
  } else if (deviceType === 'tablet') {
    deviceName = os === 'iOS' ? `iPad (${browser})` : `Tablet (${browser})`;
  } else {
    deviceName = `${os} Desktop (${browser})`;
  }

  // Screen resolution
  let screenResolution: string | undefined;
  if (typeof window !== 'undefined' && window.screen) {
    const dpr = window.devicePixelRatio && window.devicePixelRatio > 1 ? ` @${window.devicePixelRatio.toFixed(1)}x` : '';
    screenResolution = `${window.screen.width}×${window.screen.height}${dpr}`;
  }

  // Connection type
  let connectionType: string | undefined;
  const navConn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (navConn) {
    connectionType = navConn.effectiveType ? navConn.effectiveType.toUpperCase() : navConn.type;
  }

  return {
    deviceId,
    deviceName,
    deviceType,
    browser,
    os,
    color,
    screenResolution,
    connectionType,
  };
}

// Optional helper to read battery
export async function getBatteryStatus(): Promise<string | undefined> {
  if (typeof window !== 'undefined' && 'getBattery' in navigator) {
    try {
      const b: any = await (navigator as any).getBattery();
      const pct = Math.round(b.level * 100);
      return `${pct}%${b.charging ? ' (⚡ Charging)' : ''}`;
    } catch {}
  }
  return undefined;
}
