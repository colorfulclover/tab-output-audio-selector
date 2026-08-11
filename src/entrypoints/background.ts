import { AudioSettings, ExtensionMessage } from '@/utils/messaging';

const OFFSCREEN_PATH = 'offscreen.html';

/** tabId -> latest settings while capture is desired */
const tabSettings = new Map<number, AudioSettings>();
/** tabIds currently believed to have an active offscreen capture session */
const activeCaptures = new Set<number>();
/** In-flight ensureCapture promises to avoid duplicate tabCapture starts */
const captureLocks = new Map<number, Promise<void>>();

export default defineBackground(() => {
  void setupOffscreenDocument(OFFSCREEN_PATH);

  chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    void handleMessage(message);
  });
});

async function handleMessage(message: ExtensionMessage) {
  if (message.type === 'START_CAPTURE') {
    // Popup may omit streamId; Background obtains it.
    if (message.streamId) return;

    rememberPartialSettings(message.tabId, {});
    await setupOffscreenDocument(OFFSCREEN_PATH);
    await ensureCapture(message.tabId);
    await applyCachedSettings(message.tabId);
    return;
  }

  if (message.type === 'SET_DEVICE') {
    rememberPartialSettings(message.tabId, { deviceId: message.deviceId });
    await setupOffscreenDocument(OFFSCREEN_PATH);
    await ensureCapture(message.tabId);
    await forwardToOffscreen(message);
    return;
  }

  if (message.type === 'SET_VOLUME') {
    rememberPartialSettings(message.tabId, {
      volume: message.volume,
      muted: message.muted,
    });
    await setupOffscreenDocument(OFFSCREEN_PATH);
    await ensureCapture(message.tabId);
    await forwardToOffscreen(message);
    return;
  }

  if (message.type === 'CAPTURE_STATUS') {
    if (message.status === 'active') {
      activeCaptures.add(message.tabId);
    } else {
      activeCaptures.delete(message.tabId);
    }
  }
}

function rememberPartialSettings(tabId: number, partial: Partial<AudioSettings>) {
  const current = tabSettings.get(tabId) ?? {
    deviceId: 'default',
    volume: 1.0,
    muted: false,
  };
  tabSettings.set(tabId, { ...current, ...partial });
}

async function ensureCapture(tabId: number) {
  if (activeCaptures.has(tabId) && (await hasOffscreenDocument(OFFSCREEN_PATH))) {
    return;
  }

  const inFlight = captureLocks.get(tabId);
  if (inFlight) {
    await inFlight;
    if (activeCaptures.has(tabId) && (await hasOffscreenDocument(OFFSCREEN_PATH))) {
      return;
    }
  }

  const capturePromise = startCapture(tabId).finally(() => {
    if (captureLocks.get(tabId) === capturePromise) {
      captureLocks.delete(tabId);
    }
  });
  captureLocks.set(tabId, capturePromise);
  await capturePromise;
}

async function startCapture(tabId: number) {
  try {
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId,
    });

    await chrome.runtime.sendMessage({
      type: 'START_CAPTURE',
      tabId,
      streamId,
    } satisfies ExtensionMessage);

    activeCaptures.add(tabId);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // Stream already owned by an existing offscreen session.
    if (message.includes('active stream')) {
      activeCaptures.add(tabId);
      return;
    }
    console.error('Failed to start capture:', error);
    activeCaptures.delete(tabId);
  }
}

async function applyCachedSettings(tabId: number) {
  const settings = tabSettings.get(tabId);
  if (!settings) return;

  await forwardToOffscreen({
    type: 'SET_DEVICE',
    tabId,
    deviceId: settings.deviceId,
  });
  await forwardToOffscreen({
    type: 'SET_VOLUME',
    tabId,
    volume: settings.volume,
    muted: settings.muted,
  });
}

async function forwardToOffscreen(message: ExtensionMessage) {
  try {
    await chrome.runtime.sendMessage(message);
  } catch (error: unknown) {
    const text = error instanceof Error ? error.message : String(error);
    if (text.includes('Receiving end does not exist')) {
      const tabId = getTabId(message);
      if (tabId !== null) {
        activeCaptures.delete(tabId);
        await setupOffscreenDocument(OFFSCREEN_PATH);
        await startCapture(tabId);
        if (message.type === 'SET_DEVICE' || message.type === 'SET_VOLUME') {
          await chrome.runtime.sendMessage(message);
        }
      }
      return;
    }
    console.error('Failed to forward message to offscreen:', error);
  }
}

function getTabId(message: ExtensionMessage): number | null {
  if (
    message.type === 'START_CAPTURE' ||
    message.type === 'SET_DEVICE' ||
    message.type === 'SET_VOLUME' ||
    message.type === 'CAPTURE_STATUS'
  ) {
    return message.tabId;
  }
  return null;
}

let creating: Promise<void> | null = null;

async function hasOffscreenDocument(path: string): Promise<boolean> {
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [offscreenUrl],
  });
  return existingContexts.length > 0;
}

async function setupOffscreenDocument(path: string) {
  if (await hasOffscreenDocument(path)) {
    return;
  }

  if (creating) {
    await creating;
    return;
  }

  creating = chrome.offscreen.createDocument({
    url: path,
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification:
      'Capture tab audio via getUserMedia and route it to the selected output device',
  });

  try {
    await creating;
  } finally {
    creating = null;
  }
}
