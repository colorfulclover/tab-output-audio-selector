import { ExtensionMessage } from '@/utils/messaging';

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

chrome.runtime.onMessage.addListener(async (message: ExtensionMessage, sender, sendResponse) => {
  if (message.type === 'START_CAPTURE') {
    await startCapture(message.tabId, message.streamId);
  } else if (message.type === 'SET_VOLUME') {
    setVolume(message.tabId, message.volume, message.muted);
  } else if (message.type === 'SET_DEVICE') {
    await setDevice(message.tabId, message.deviceId);
  }
});

async function startCapture(tabId: number, streamId: string) {
  try {
    // If session exists, close it first
    stopCapture(tabId);

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
    await audioElement.play();

    // Monitor stream ended (tab closed or capture stopped)
    stream.getVideoTracks()[0]?.addEventListener('ended', () => {
      stopCapture(tabId);
    });
    
    // Audio tracks might also end
    stream.getAudioTracks()[0]?.addEventListener('ended', () => {
        stopCapture(tabId);
    });

    sessions.set(tabId, { context, source, gain, stream, destination, audioElement });
    console.log(`Started capture for tab ${tabId}`);

  } catch (err) {
    console.error(`Failed to capture tab ${tabId}:`, err);
  }
}

function stopCapture(tabId: number) {
  const session = sessions.get(tabId);
  if (session) {
    session.stream.getTracks().forEach(t => t.stop());
    session.audioElement.pause();
    session.audioElement.srcObject = null;
    session.context.close();
    sessions.delete(tabId);
    console.log(`Stopped capture for tab ${tabId}`);
  }
}

function setVolume(tabId: number, volume: number, muted: boolean) {
  const session = sessions.get(tabId);
  if (session) {
    // Smooth transition
    const currentTime = session.context.currentTime;
    const targetValue = muted ? 0 : volume;
    session.gain.gain.setTargetAtTime(targetValue, currentTime, 0.1);
  }
}

async function setDevice(tabId: number, deviceId: string) {
  const session = sessions.get(tabId);
  if (session) {
    const element = session.audioElement as any;
    if (element.setSinkId) {
        try {
            await element.setSinkId(deviceId);
            console.log(`Set device for tab ${tabId} to ${deviceId}`);
        } catch(e) {
            console.error("Failed to setSinkId on AudioElement", e);
        }
    } else {
        console.warn("HTMLMediaElement.prototype.setSinkId is not supported in this environment.");
    }
  }
}

