import assert from 'node:assert/strict';
import { test } from 'vitest';

let messageListener;
let getUserMedia;
let contexts = [];
let audioElements = [];
let events = [];

class FakeTrack {
  endedListener;

  addEventListener(type, listener) {
    if (type === 'ended') this.endedListener = listener;
  }

  stop() {}

  end() {
    this.endedListener?.();
  }
}

class FakeStream {
  audioTrack = new FakeTrack();

  getAudioTracks() {
    return [this.audioTrack];
  }

  getVideoTracks() {
    return [];
  }

  getTracks() {
    return [this.audioTrack];
  }
}

class FakeAudioContext {
  currentTime = 5;
  gainCalls = [];

  constructor() {
    contexts.push(this);
  }

  createMediaStreamSource() {
    return { connect() {} };
  }

  createGain() {
    return {
      connect() {},
      gain: {
        setTargetAtTime: (value, startTime, timeConstant) => {
          this.gainCalls.push({ value, startTime, timeConstant });
        },
      },
    };
  }

  createMediaStreamDestination() {
    return { stream: {} };
  }

  close() {}
}

class FakeAudio {
  sinkIds = [];
  playCalls = 0;
  srcObject = null;

  constructor() {
    audioElements.push(this);
  }

  async setSinkId(deviceId) {
    this.sinkIds.push(deviceId);
    events.push(`sink:${deviceId}`);
  }

  async play() {
    this.playCalls += 1;
    events.push('play');
  }

  pause() {}
}

globalThis.chrome = {
  runtime: {
    onMessage: {
      addListener(listener) {
        messageListener = listener;
      },
    },
  },
};
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    mediaDevices: {
      getUserMedia: (...args) => getUserMedia(...args),
    },
  },
});
globalThis.AudioContext = FakeAudioContext;
globalThis.Audio = FakeAudio;

await import('../src/utils/offscreen-handler.ts');

function resetFakes() {
  contexts = [];
  audioElements = [];
  events = [];
}

function createDeferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

test('applies restored settings after the audio session is created', async () => {
  resetFakes();
  getUserMedia = async () => new FakeStream();

  await messageListener({
    type: 'START_CAPTURE',
    tabId: 101,
    streamId: 'stream-101',
    settings: { deviceId: 'sink-a', volume: 0.4, muted: false },
  });

  assert.deepEqual(audioElements[0].sinkIds, ['sink-a']);
  assert.deepEqual(contexts[0].gainCalls, [
    { value: 0.4, startTime: 5, timeConstant: 0.1 },
  ]);
  assert.deepEqual(events, ['sink:sink-a', 'play']);
});

test('keeps settings received while capture is not ready', async () => {
  resetFakes();
  const media = createDeferred();
  getUserMedia = () => media.promise;

  const capture = messageListener({
    type: 'START_CAPTURE',
    tabId: 202,
    streamId: 'stream-202',
    settings: { deviceId: 'stored-sink', volume: 0.8, muted: false },
  });

  await messageListener({ type: 'SET_DEVICE', tabId: 202, deviceId: 'latest-sink' });
  await messageListener({ type: 'SET_VOLUME', tabId: 202, volume: 0.25, muted: true });
  media.resolve(new FakeStream());
  await capture;

  assert.deepEqual(audioElements[0].sinkIds, ['latest-sink']);
  assert.deepEqual(contexts[0].gainCalls, [
    { value: 0, startTime: 5, timeConstant: 0.1 },
  ]);
});

test('restores the saved sink and volume when capture is rebuilt', async () => {
  resetFakes();
  const firstStream = new FakeStream();
  const secondStream = new FakeStream();
  const streams = [firstStream, secondStream];
  getUserMedia = async () => streams.shift();

  await messageListener({
    type: 'START_CAPTURE',
    tabId: 303,
    streamId: 'stream-303-a',
    settings: { deviceId: 'sink-before', volume: 0.7, muted: false },
  });
  firstStream.audioTrack.end();
  await messageListener({
    type: 'START_CAPTURE',
    tabId: 303,
    streamId: 'stream-303-b',
    settings: { deviceId: 'sink-after', volume: 0.2, muted: false },
  });

  assert.deepEqual(audioElements[1].sinkIds, ['sink-after']);
  assert.deepEqual(contexts[1].gainCalls, [
    { value: 0.2, startTime: 5, timeConstant: 0.1 },
  ]);
});
