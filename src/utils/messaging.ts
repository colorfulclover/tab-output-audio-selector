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

export type CaptureStatus = 'active' | 'pending' | 'needs_action' | 'error';

export interface CaptureResult {
  status: CaptureStatus;
  error?: string;
}

export type ExtensionMessage = 
  | { type: 'START_CAPTURE'; tabId: number; streamId?: string; settings?: AudioSettings }
  | { type: 'SET_VOLUME'; tabId: number; volume: number; muted: boolean }
  | { type: 'SET_DEVICE'; tabId: number; deviceId: string }
  | { type: 'CAPTURE_STATUS'; tabId: number; status: CaptureStatus; error?: string };
