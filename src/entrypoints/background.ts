import { ExtensionMessage } from '@/utils/messaging';

export default defineBackground(() => {
  // Setup offscreen document
  setupOffscreenDocument('offscreen.html');

  chrome.runtime.onMessage.addListener(async (message: ExtensionMessage, sender, sendResponse) => {
    // Forward messages to offscreen document
    // We handle START_CAPTURE specially to get the streamId first
    if (message.type === 'START_CAPTURE') {
      await setupOffscreenDocument('offscreen.html');
      handleStartCapture(message.tabId);
    } else if (
      message.type === 'SET_VOLUME' || 
      message.type === 'SET_DEVICE'
    ) {
      chrome.runtime.sendMessage(message);
    }
  });
});

async function handleStartCapture(tabId: number) {
  try {
    // 1. Get Stream ID
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId
    });

    // 2. Send to Offscreen
    await chrome.runtime.sendMessage({
      type: 'START_CAPTURE',
      tabId,
      streamId
    });

  } catch (error) {
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
      reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: 'Capture tab audio for volume and output control',
    });
    await creating;
    creating = null;
  }
}
