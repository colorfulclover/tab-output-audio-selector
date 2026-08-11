import type {
  AudioSettings,
  CaptureResult,
  CaptureStatus,
  ExtensionMessage,
} from '@/utils/messaging';
import { VOLUME_DEFAULT, clampVolume } from './volume';

// Map tabId -> AudioContext/Nodes
interface AudioSession {
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  gain: GainNode;
  compressor: DynamicsCompressorNode;
  stream: MediaStream;
  destination: MediaStreamAudioDestinationNode;
  audioElement: HTMLAudioElement;
}

const sessions = new Map<number, AudioSession>();
const desiredSettings = new Map<number, Partial<AudioSettings>>();
const defaultSettings: AudioSettings = {
  deviceId: 'default',
  volume: VOLUME_DEFAULT,
  muted: false,
};

function createLimiter(context: AudioContext): DynamicsCompressorNode {
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -3;
  compressor.knee.value = 6;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  return compressor;
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === 'START_CAPTURE' && message.streamId) {
    return startCapture(message.tabId, message.streamId, message.settings);
  } else if (message.type === 'SET_VOLUME') {
    setVolume(message.tabId, message.volume, message.muted);
    return Promise.resolve({
      status: sessions.has(message.tabId) ? 'active' : 'pending',
    } satisfies CaptureResult);
  } else if (message.type === 'SET_DEVICE') {
    return setDevice(message.tabId, message.deviceId);
  }
});

async function startCapture(
  tabId: number,
  streamId: string,
  settings?: AudioSettings,
): Promise<CaptureResult> {
  try {
    const pendingSettings = desiredSettings.get(tabId);
    const mergedSettings = {
      ...defaultSettings,
      ...settings,
      ...pendingSettings,
    };
    desiredSettings.set(tabId, {
      ...mergedSettings,
      volume: clampVolume(mergedSettings.volume),
    });
    stopCapture(tabId, false);

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      } as any,
      video: false
    });

    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const gain = context.createGain();
    const compressor = createLimiter(context);
    const destination = context.createMediaStreamDestination();
    const audioElement = new Audio();

    source.connect(gain);
    gain.connect(compressor);
    compressor.connect(destination);

    audioElement.srcObject = destination.stream;
    sessions.set(tabId, { context, source, gain, compressor, stream, destination, audioElement });

    stream.getTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        if (sessions.get(tabId)?.stream === stream) {
          stopCapture(tabId);
          notifyCaptureStatus(tabId, 'needs_action');
        }
      });
    });

    applyVolume(tabId);
    await applyDevice(tabId);
    await audioElement.play();

    console.log(`Started capture for tab ${tabId}`);
    notifyCaptureStatus(tabId, 'active');
    return { status: 'active' };

  } catch (err) {
    stopCapture(tabId, false);
    console.error(`Failed to capture tab ${tabId}:`, err);
    const error = getErrorMessage(err);
    notifyCaptureStatus(tabId, 'error', error);
    return { status: 'error', error };
  }
}

function notifyCaptureStatus(tabId: number, status: CaptureStatus, error?: string) {
  void chrome.runtime.sendMessage({
    type: 'CAPTURE_STATUS',
    tabId,
    status,
    error,
  } satisfies ExtensionMessage).catch((sendError) => {
    console.error('Failed to report capture status:', sendError);
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function stopCapture(tabId: number, clearSettings = true) {
  const session = sessions.get(tabId);
  if (session) {
    sessions.delete(tabId);
    session.stream.getTracks().forEach(t => t.stop());
    session.audioElement.pause();
    session.audioElement.srcObject = null;
    session.context.close();
    console.log(`Stopped capture for tab ${tabId}`);
  }

  if (clearSettings) {
    desiredSettings.delete(tabId);
  }
}

function setVolume(tabId: number, volume: number, muted: boolean) {
  desiredSettings.set(tabId, {
    ...desiredSettings.get(tabId),
    volume: clampVolume(volume),
    muted,
  });
  applyVolume(tabId);
}

function applyVolume(tabId: number) {
  const settings = desiredSettings.get(tabId);
  const session = sessions.get(tabId);
  if (session && settings?.volume !== undefined && settings.muted !== undefined) {
    const currentTime = session.context.currentTime;
    const targetValue = settings.muted ? 0 : clampVolume(settings.volume);
    session.gain.gain.setTargetAtTime(targetValue, currentTime, 0.1);
  }
}

async function setDevice(tabId: number, deviceId: string): Promise<CaptureResult> {
  desiredSettings.set(tabId, {
    ...desiredSettings.get(tabId),
    deviceId,
  });
  try {
    await applyDevice(tabId);
    return { status: sessions.has(tabId) ? 'active' : 'pending' };
  } catch (error) {
    console.error('Failed to setSinkId on AudioElement', error);
    const errorMessage = getErrorMessage(error);
    notifyCaptureStatus(tabId, 'error', errorMessage);
    return { status: 'error', error: errorMessage };
  }
}

async function applyDevice(tabId: number) {
  const settings = desiredSettings.get(tabId);
  const session = sessions.get(tabId);
  if (session && settings?.deviceId) {
    if (session.audioElement.setSinkId) {
      await session.audioElement.setSinkId(settings.deviceId);
      console.log(`Set device for tab ${tabId} to ${settings.deviceId}`);
    } else {
      throw new Error('HTMLMediaElement.prototype.setSinkId is not supported in this environment.');
    }
  }
}

