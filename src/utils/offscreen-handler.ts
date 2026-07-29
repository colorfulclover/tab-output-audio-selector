import type { AudioSettings, ExtensionMessage } from '@/utils/messaging';

// Map tabId -> AudioContext/Nodes
interface AudioSession {
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  gain: GainNode;
  stream: MediaStream;
  destination: MediaStreamAudioDestinationNode;
  audioElement: HTMLAudioElement;
}

const sessions = new Map<number, AudioSession>();
const desiredSettings = new Map<number, Partial<AudioSettings>>();
const defaultSettings: AudioSettings = {
  deviceId: 'default',
  volume: 1,
  muted: false,
};

chrome.runtime.onMessage.addListener(async (message: ExtensionMessage) => {
  if (message.type === 'START_CAPTURE' && message.streamId) {
    await startCapture(message.tabId, message.streamId, message.settings);
  } else if (message.type === 'SET_VOLUME') {
    setVolume(message.tabId, message.volume, message.muted);
  } else if (message.type === 'SET_DEVICE') {
    await setDevice(message.tabId, message.deviceId);
  }
});

async function startCapture(tabId: number, streamId: string, settings?: AudioSettings) {
  try {
    const pendingSettings = desiredSettings.get(tabId);
    desiredSettings.set(tabId, {
      ...defaultSettings,
      ...settings,
      ...pendingSettings,
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
    const destination = context.createMediaStreamDestination();
    const audioElement = new Audio();

    source.connect(gain);
    gain.connect(destination);

    audioElement.srcObject = destination.stream;
    sessions.set(tabId, { context, source, gain, stream, destination, audioElement });

    stream.getTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        if (sessions.get(tabId)?.stream === stream) {
          stopCapture(tabId);
        }
      });
    });

    applyVolume(tabId);
    await applyDevice(tabId);
    await audioElement.play();

    console.log(`Started capture for tab ${tabId}`);

  } catch (err) {
    stopCapture(tabId, false);
    console.error(`Failed to capture tab ${tabId}:`, err);
  }
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
    volume,
    muted,
  });
  applyVolume(tabId);
}

function applyVolume(tabId: number) {
  const settings = desiredSettings.get(tabId);
  const session = sessions.get(tabId);
  if (session && settings?.volume !== undefined && settings.muted !== undefined) {
    const currentTime = session.context.currentTime;
    const targetValue = settings.muted ? 0 : settings.volume;
    session.gain.gain.setTargetAtTime(targetValue, currentTime, 0.1);
  }
}

async function setDevice(tabId: number, deviceId: string) {
  desiredSettings.set(tabId, {
    ...desiredSettings.get(tabId),
    deviceId,
  });
  await applyDevice(tabId);
}

async function applyDevice(tabId: number) {
  const settings = desiredSettings.get(tabId);
  const session = sessions.get(tabId);
  if (session && settings?.deviceId) {
    if (session.audioElement.setSinkId) {
      try {
        await session.audioElement.setSinkId(settings.deviceId);
        console.log(`Set device for tab ${tabId} to ${settings.deviceId}`);
      } catch (e) {
        console.error('Failed to setSinkId on AudioElement', e);
      }
    } else {
      console.warn('HTMLMediaElement.prototype.setSinkId is not supported in this environment.');
    }
  }
}

