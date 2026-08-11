import { AudioSettings, ExtensionMessage } from '@/utils/messaging';

interface AudioSession {
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  gain: GainNode;
  stream: MediaStream;
  destination: MediaStreamAudioDestinationNode;
  audioElement: HTMLAudioElement;
}

const sessions = new Map<number, AudioSession>();
const tabSettings = new Map<number, AudioSettings>();
const startingCaptures = new Map<number, Promise<void>>();

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  void handleMessage(message);
});

async function handleMessage(message: ExtensionMessage) {
  if (message.type === 'START_CAPTURE') {
    if (!message.streamId) return;
    await enqueueStartCapture(message.tabId, message.streamId);
  } else if (message.type === 'SET_VOLUME') {
    updateSettings(message.tabId, {
      volume: message.volume,
      muted: message.muted,
    });
    setVolume(message.tabId, message.volume, message.muted);
  } else if (message.type === 'SET_DEVICE') {
    updateSettings(message.tabId, { deviceId: message.deviceId });
    await setDevice(message.tabId, message.deviceId);
  }
}

function updateSettings(tabId: number, partial: Partial<AudioSettings>) {
  const current = tabSettings.get(tabId) ?? {
    deviceId: 'default',
    volume: 1.0,
    muted: false,
  };
  tabSettings.set(tabId, { ...current, ...partial });
}

async function enqueueStartCapture(tabId: number, streamId: string) {
  const inFlight = startingCaptures.get(tabId);
  if (inFlight) {
    await inFlight;
  }

  const startPromise = startCapture(tabId, streamId).finally(() => {
    if (startingCaptures.get(tabId) === startPromise) {
      startingCaptures.delete(tabId);
    }
  });
  startingCaptures.set(tabId, startPromise);
  await startPromise;
}

async function startCapture(tabId: number, streamId: string) {
  try {
    stopCapture(tabId, false);

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      } as any,
      video: false,
    });

    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const gain = context.createGain();
    const destination = context.createMediaStreamDestination();
    const audioElement = new Audio();

    source.connect(gain);
    gain.connect(destination);

    audioElement.srcObject = destination.stream;
    await audioElement.play();

    stream.getAudioTracks()[0]?.addEventListener('ended', () => {
      stopCapture(tabId, true);
    });

    sessions.set(tabId, { context, source, gain, stream, destination, audioElement });
    console.log(`Started capture for tab ${tabId}`);

    await applyStoredSettings(tabId);
    notifyStatus(tabId, 'active');
  } catch (err) {
    console.error(`Failed to capture tab ${tabId}:`, err);
    notifyStatus(tabId, 'error', err instanceof Error ? err.message : String(err));
  }
}

function stopCapture(tabId: number, notify: boolean) {
  const session = sessions.get(tabId);
  if (!session) return;

  session.stream.getTracks().forEach((t) => t.stop());
  session.audioElement.pause();
  session.audioElement.srcObject = null;
  void session.context.close();
  sessions.delete(tabId);
  console.log(`Stopped capture for tab ${tabId}`);

  if (notify) {
    notifyStatus(tabId, 'inactive');
  }
}

async function applyStoredSettings(tabId: number) {
  const settings = tabSettings.get(tabId);
  if (!settings) return;

  setVolume(tabId, settings.volume, settings.muted);
  if (settings.deviceId) {
    await setDevice(tabId, settings.deviceId);
  }
}

function setVolume(tabId: number, volume: number, muted: boolean) {
  const session = sessions.get(tabId);
  if (!session) return;

  const currentTime = session.context.currentTime;
  const targetValue = muted ? 0 : volume;
  session.gain.gain.setTargetAtTime(targetValue, currentTime, 0.1);
}

async function setDevice(tabId: number, deviceId: string) {
  const session = sessions.get(tabId);
  if (!session) return;

  const element = session.audioElement as HTMLAudioElement & {
    setSinkId?: (id: string) => Promise<void>;
  };

  if (!element.setSinkId) {
    console.warn('HTMLMediaElement.prototype.setSinkId is not supported in this environment.');
    return;
  }

  try {
    await element.setSinkId(deviceId);
    console.log(`Set device for tab ${tabId} to ${deviceId}`);
  } catch (e) {
    console.error('Failed to setSinkId on AudioElement', e);
  }
}

function notifyStatus(
  tabId: number,
  status: 'active' | 'inactive' | 'error',
  error?: string
) {
  const message: ExtensionMessage = { type: 'CAPTURE_STATUS', tabId, status, error };
  chrome.runtime.sendMessage(message).catch(() => {
    // Service worker may be asleep; status is best-effort.
  });
}
