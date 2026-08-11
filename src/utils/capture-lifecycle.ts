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
  /** Injectable for tests; defaults to setTimeout-based delay. */
  delay?(ms: number): Promise<void>;
}

const DEFAULT_PENDING_POLL_ATTEMPTS = 5;
const DEFAULT_PENDING_POLL_INTERVAL_MS = 200;

function isCaptured(status: string): boolean {
  return status === 'active' || status === 'pending';
}

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createCaptureLifecycle(dependencies: CaptureLifecycleDependencies) {
  const pendingCaptures = new Map<number, Promise<CaptureResult>>();
  const delay = dependencies.delay ?? defaultDelay;

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

  async function findCapturedTab(tabId: number): Promise<CapturedTab | undefined> {
    const capturedTabs = await dependencies.getCapturedTabs();
    return capturedTabs.find((tab) => tab.tabId === tabId);
  }

  /**
   * Chrome may report `pending` while a capture is still starting, or after a
   * failed hand-off that left a stale pending entry. Poll briefly, then either
   * reuse an active capture, retry start, or surface needs_action.
   */
  async function resolveChromePending(
    tabId: number,
  ): Promise<'active' | 'retry' | 'stale'> {
    for (let attempt = 0; attempt < DEFAULT_PENDING_POLL_ATTEMPTS; attempt++) {
      await delay(DEFAULT_PENDING_POLL_INTERVAL_MS);
      const tab = await findCapturedTab(tabId);

      if (tab?.status === 'active') {
        return 'active';
      }
      if (!tab || tab.status === 'stopped' || tab.status === 'error') {
        return 'retry';
      }
      // still pending — keep polling
    }
    return 'stale';
  }

  async function beginOffscreenCapture(tabId: number): Promise<CaptureResult> {
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

  async function startCaptureInternal(tabId: number): Promise<CaptureResult> {
    const capturedTab = await findCapturedTab(tabId);

    if (capturedTab?.status === 'active') {
      await dependencies.clearIndicator(tabId);
      return { status: 'active' };
    }

    if (capturedTab?.status === 'pending') {
      const resolution = await resolveChromePending(tabId);
      if (resolution === 'active') {
        await dependencies.clearIndicator(tabId);
        return { status: 'active' };
      }
      if (resolution === 'stale') {
        await dependencies.markNeedsAction(tabId);
        return { status: 'needs_action' };
      }
      // pending cleared — fall through and start fresh
    }

    return beginOffscreenCapture(tabId);
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
