export interface AudioSettings {
  deviceId: string;
  volume: number;
  muted: boolean;
}

export interface DeviceInfo {
  deviceId: string;
  label: string;
}

export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
}

export type ExtensionMessage =
  | { type: 'START_CAPTURE'; tabId: number; streamId?: string }
  | { type: 'SET_VOLUME'; tabId: number; volume: number; muted: boolean }
  | { type: 'SET_DEVICE'; tabId: number; deviceId: string }
  | { type: 'CAPTURE_STATUS'; tabId: number; status: 'active' | 'inactive' | 'error'; error?: string };
