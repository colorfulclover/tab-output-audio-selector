import type { AudioSettings } from '@/utils/messaging';

export interface SavedAudioSettings {
  deviceId: string | null;
  volume: number;
  muted: boolean;
}

export function hasNonDefaultAudioSettings(settings: SavedAudioSettings | null): boolean {
  return !!settings && (
    (!!settings.deviceId && settings.deviceId !== 'default') ||
    settings.volume !== 1 ||
    settings.muted
  );
}

interface CaptureSettingsDependencies {
  getTab(tabId: number): Promise<{ url?: string }>;
  getAudioSettings(url: string): Promise<SavedAudioSettings | null>;
}

export async function loadCaptureSettings(
  tabId: number,
  dependencies: CaptureSettingsDependencies,
): Promise<AudioSettings | undefined> {
  const tab = await dependencies.getTab(tabId);
  if (!tab.url) return undefined;

  const saved = await dependencies.getAudioSettings(tab.url);
  if (!saved) return undefined;

  return {
    deviceId: saved.deviceId || 'default',
    volume: saved.volume,
    muted: saved.muted,
  };
}
