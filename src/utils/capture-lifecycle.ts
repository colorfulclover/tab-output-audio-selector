import type { AudioSettings, CaptureResult, CaptureStatus } from './messaging';
import {
  hasNonDefaultAudioSettings,
  type SavedAudioSettings,
} from './capture-settings';

interface CaptureTab {
  id?: number;
  url?: string;
}

interface CapturedTab {
  tabId: number;
  status: string;
}

interface CaptureLifecycleDependencies {
  queryTabs(): Promise<CaptureTab[]>;
  getCapturedTabs(): Promise<CapturedTab[]>;
  getAudioSettings(url: string): Promise<SavedAudioSettings | null>;
  loadCaptureSettings(tabId: number): Promise<AudioSettings | undefined>;
  getMediaStreamId(tabId: number): Promise<string>;
  startOffscreenCapture(
    tabId: number,
    streamId: string,
    settings?: AudioSettings,
  ): Promise<CaptureResult>;
  markNeedsAction(tabId: number): Promise<void>;
  clearIndicator(tabId: number): Promise<void>;
}

function isCaptured(status: string): boolean {
  return status === 'active' || status === 'pending';
}

export function createCaptureLifecycle(dependencies: CaptureLifecycleDependencies) {
  const pendingCaptures = new Map<number, Promise<CaptureResult>>();

  async function updateTabIndicator(tab: CaptureTab, capturedTabIds: Set<number>) {
    if (tab.id === undefined) return;

    if (capturedTabIds.has(tab.id)) {
      await dependencies.clearIndicator(tab.id);
      return;
    }

    const settings = tab.url
      ? await dependencies.getAudioSettings(tab.url)
      : null;

    if (hasNonDefaultAudioSettings(settings)) {
      await dependencies.markNeedsAction(tab.id);
    } else {
      await dependencies.clearIndicator(tab.id);
    }
  }

  async function handleStartup() {
    const [tabs, capturedTabs] = await Promise.all([
      dependencies.queryTabs(),
      dependencies.getCapturedTabs(),
    ]);
    const capturedTabIds = new Set(
      capturedTabs.filter((tab) => isCaptured(tab.status)).map((tab) => tab.tabId),
    );

    await Promise.all(tabs.map((tab) => updateTabIndicator(tab, capturedTabIds)));
  }

  async function handleTabUpdated(tab: CaptureTab) {
    const capturedTabs = await dependencies.getCapturedTabs();
    const capturedTabIds = new Set(
      capturedTabs.filter((item) => isCaptured(item.status)).map((item) => item.tabId),
    );
    await updateTabIndicator(tab, capturedTabIds);
  }

  async function startCaptureInternal(tabId: number): Promise<CaptureResult> {
    const capturedTabs = await dependencies.getCapturedTabs();
    const capturedTab = capturedTabs.find((tab) => tab.tabId === tabId && isCaptured(tab.status));

    if (capturedTab?.status === 'active') {
      await dependencies.clearIndicator(tabId);
      return { status: 'active' };
    }
    if (capturedTab?.status === 'pending') {
      return { status: 'pending' };
    }

    try {
      const [streamId, settings] = await Promise.all([
        dependencies.getMediaStreamId(tabId),
        dependencies.loadCaptureSettings(tabId),
      ]);
      const result = await dependencies.startOffscreenCapture(tabId, streamId, settings);

      if (result.status === 'active') {
        await dependencies.clearIndicator(tabId);
      } else {
        await dependencies.markNeedsAction(tabId);
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await dependencies.markNeedsAction(tabId);
      return { status: 'error', error: message };
    }
  }

  function startCapture(tabId: number): Promise<CaptureResult> {
    const existing = pendingCaptures.get(tabId);
    if (existing) return existing;

    const capture = startCaptureInternal(tabId).finally(() => {
      pendingCaptures.delete(tabId);
    });
    pendingCaptures.set(tabId, capture);
    return capture;
  }

  async function handleCaptureStatus(tabId: number, status: CaptureStatus) {
    if (status === 'active') {
      await dependencies.clearIndicator(tabId);
    } else {
      await dependencies.markNeedsAction(tabId);
    }
  }

  return {
    handleCaptureStatus,
    handleStartup,
    handleTabUpdated,
    startCapture,
  };
}
