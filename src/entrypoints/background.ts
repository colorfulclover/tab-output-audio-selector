import type { CaptureResult, CaptureStatus, ExtensionMessage } from '@/utils/messaging';
import { createCaptureLifecycle } from '@/utils/capture-lifecycle';
import { loadCaptureSettings } from '@/utils/capture-settings';
import { sendWithOffscreenRetry } from '@/utils/offscreen-messaging';
import { getAudioSettings } from '@/utils/storage';

const OFFSCREEN_PATH = 'offscreen.html';

export default defineBackground(() => {
  const lifecycle = createCaptureLifecycle({
    queryTabs: () => chrome.tabs.query({}),
    getCapturedTabs: () => chrome.tabCapture.getCapturedTabs(),
    getAudioSettings,
    loadCaptureSettings: (tabId) => loadCaptureSettings(tabId, {
      getTab: (id) => chrome.tabs.get(id),
      getAudioSettings,
    }),
    getMediaStreamId: async (tabId) => {
      await setupOffscreenDocument(OFFSCREEN_PATH);
      return chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
    },
    startOffscreenCapture: async (tabId, streamId, settings) => {
      try {
        const result = await sendWithOffscreenRetry(
          () => chrome.runtime.sendMessage({
            type: 'START_CAPTURE',
            tabId,
            streamId,
            settings,
          } satisfies ExtensionMessage) as Promise<CaptureResult | undefined>,
          () => setupOffscreenDocument(OFFSCREEN_PATH),
        );

        return result ?? { status: 'error', error: 'Offscreen document did not respond.' };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { status: 'error', error: message };
      }
    },
    markNeedsAction,
    clearIndicator,
  });

  chrome.runtime.onStartup.addListener(() => {
    void lifecycle.handleStartup().catch((error) => {
      console.error('Failed to restore startup indicators:', error);
    });
  });

  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === 'complete') {
      void lifecycle.handleTabUpdated(tab).catch((error) => {
        console.error('Failed to update capture indicator:', error);
      });
    }
  });

  chrome.tabCapture.onStatusChanged.addListener((info) => {
    if (info.status === 'stopped' || info.status === 'error') {
      const status: CaptureStatus = info.status === 'error' ? 'error' : 'needs_action';
      void lifecycle.handleCaptureStatus(info.tabId, status).catch((error) => {
        console.error('Failed to update capture status:', error);
      });
    }
  });

  chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type === 'START_CAPTURE' && !message.streamId) {
      return lifecycle.startCapture(message.tabId);
    }

    if (message.type === 'CAPTURE_STATUS') {
      return lifecycle.handleCaptureStatus(message.tabId, message.status);
    }
  });
});

async function markNeedsAction(tabId: number) {
  const title = chrome.i18n.getMessage('actionNeedsTitle') ||
    'Needs action: click to restore saved audio output.';

  await Promise.all([
    chrome.action.setBadgeText({ tabId, text: '!' }),
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#d97706' }),
    chrome.action.setTitle({ tabId, title }),
  ]);
}

async function clearIndicator(tabId: number) {
  await Promise.all([
    chrome.action.setBadgeText({ tabId, text: '' }),
    chrome.action.setTitle({ tabId, title: chrome.runtime.getManifest().name }),
  ]);
}

// Manage Offscreen Document lifecycle
let creating: Promise<void> | null = null;
async function setupOffscreenDocument(path: string) {
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    return;
  }

  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: [chrome.offscreen.Reason.USER_MEDIA],
      justification: 'Capture tab audio for volume and output control',
    });
    try {
      await creating;
    } finally {
      creating = null;
    }
  }
}
