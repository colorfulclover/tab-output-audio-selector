import type { ExtensionMessage } from '@/utils/messaging';
import { loadCaptureSettings } from '@/utils/capture-settings';
import { getAudioSettings } from '@/utils/storage';

export default defineBackground(() => {
  // Setup offscreen document
  setupOffscreenDocument('offscreen.html');

  chrome.runtime.onMessage.addListener(async (message: ExtensionMessage) => {
    // Forward messages to offscreen document
    // We handle START_CAPTURE specially to get the streamId first
    if (message.type === 'START_CAPTURE') {
      await setupOffscreenDocument('offscreen.html');
      await handleStartCapture(message.tabId);
    } else if (
      message.type === 'SET_VOLUME' || 
      message.type === 'SET_DEVICE'
    ) {
      await setupOffscreenDocument('offscreen.html');
      await chrome.runtime.sendMessage(message);
    }
  });
});

async function handleStartCapture(tabId: number) {
  try {
    const [streamId, settings] = await Promise.all([
      chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }),
      loadCaptureSettings(tabId, {
        getTab: (id) => chrome.tabs.get(id),
        getAudioSettings,
      }),
    ]);

    await chrome.runtime.sendMessage({
      type: 'START_CAPTURE',
      tabId,
      streamId,
      settings,
    });

  } catch (error: any) {
    // Ignore error if stream is already active
    if (error.message && error.message.includes('active stream')) {
      // console.log('Stream already active for tab', tabId);
      return;
    }
    console.error('Failed to start capture:', error);
  }
}

// Manage Offscreen Document lifecycle
let creating: Promise<void> | null = null;
async function setupOffscreenDocument(path: string) {
  // Check if offscreen document already exists
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    return;
  }

  // Create offscreen document
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: [chrome.offscreen.Reason.USER_MEDIA],
      justification: 'Capture tab audio for volume and output control',
    });
    await creating;
    creating = null;
  }
}
