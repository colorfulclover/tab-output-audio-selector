import assert from 'node:assert/strict';
import { test } from 'vitest';

let messageListener;
let getUserMedia;
let contexts = [];
let audioElements = [];
let events = [];
let runtimeMessages = [];
let setSinkError = null;

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

  createDynamicsCompressor() {
    return {
      connect() {},
      threshold: { value: -24 },
      knee: { value: 30 },
      ratio: { value: 12 },
      attack: { value: 0.003 },
      release: { value: 0.25 },
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
    if (setSinkError) throw setSinkError;
  }

  async play() {
    this.playCalls += 1;
    events.push('play');
  }

  pause() {}
}

globalThis.chrome = {
  runtime: {
    async sendMessage(message) {
      runtimeMessages.push(message);
    },
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
  runtimeMessages = [];
  setSinkError = null;
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

  const result = await messageListener({
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
  assert.deepEqual(result, { status: 'active' });
  assert.deepEqual(runtimeMessages, [{
    type: 'CAPTURE_STATUS',
    tabId: 101,
    status: 'active',
    error: undefined,
  }]);
});

test('does not respond to capture requests that belong to the background', () => {
  resetFakes();

  const result = messageListener({
    type: 'START_CAPTURE',
    tabId: 102,
  });

  assert.equal(result, undefined);
});

test('returns a Promise response for volume updates', async () => {
  resetFakes();
  getUserMedia = async () => new FakeStream();

  await messageListener({
    type: 'START_CAPTURE',
    tabId: 103,
    streamId: 'stream-103',
    settings: { deviceId: 'sink-a', volume: 0.8, muted: false },
  });

  const result = messageListener({
    type: 'SET_VOLUME',
    tabId: 103,
    volume: 0.25,
    muted: false,
  });

  assert.ok(result instanceof Promise);
  assert.deepEqual(await result, { status: 'active' });
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

test('returns an error when the tab stream cannot be created', async () => {
  resetFakes();
  getUserMedia = async () => {
    throw new Error('getUserMedia failed');
  };

  const result = await messageListener({
    type: 'START_CAPTURE',
    tabId: 404,
    streamId: 'stream-404',
    settings: { deviceId: 'sink-a', volume: 0.4, muted: false },
  });

  assert.deepEqual(result, { status: 'error', error: 'getUserMedia failed' });
  assert.deepEqual(audioElements, []);
  assert.deepEqual(runtimeMessages, [{
    type: 'CAPTURE_STATUS',
    tabId: 404,
    status: 'error',
    error: 'getUserMedia failed',
  }]);
});

test('returns an error when the saved output device cannot be restored', async () => {
  resetFakes();
  getUserMedia = async () => new FakeStream();
  setSinkError = new Error('setSinkId failed');

  const result = await messageListener({
    type: 'START_CAPTURE',
    tabId: 505,
    streamId: 'stream-505',
    settings: { deviceId: 'missing-sink', volume: 0.6, muted: false },
  });

  assert.deepEqual(result, { status: 'error', error: 'setSinkId failed' });
  assert.deepEqual(audioElements[0].sinkIds, ['missing-sink']);
  assert.equal(audioElements[0].playCalls, 0);
  assert.deepEqual(runtimeMessages, [{
    type: 'CAPTURE_STATUS',
    tabId: 505,
    status: 'error',
    error: 'setSinkId failed',
  }]);
});

test('reports an output-device change failure after capture is active', async () => {
  resetFakes();
  getUserMedia = async () => new FakeStream();

  await messageListener({
    type: 'START_CAPTURE',
    tabId: 506,
    streamId: 'stream-506',
    settings: { deviceId: 'sink-a', volume: 0.6, muted: false },
  });
  runtimeMessages = [];
  setSinkError = new Error('setSinkId change failed');

  const result = await messageListener({
    type: 'SET_DEVICE',
    tabId: 506,
    deviceId: 'missing-sink',
  });

  assert.deepEqual(result, { status: 'error', error: 'setSinkId change failed' });
  assert.deepEqual(runtimeMessages, [{
    type: 'CAPTURE_STATUS',
    tabId: 506,
    status: 'error',
    error: 'setSinkId change failed',
  }]);
});

test('track end reports Needs action for only the affected tab', async () => {
  resetFakes();
  const firstStream = new FakeStream();
  const secondStream = new FakeStream();
  const streams = [firstStream, secondStream];
  getUserMedia = async () => streams.shift();

  await messageListener({
    type: 'START_CAPTURE',
    tabId: 601,
    streamId: 'stream-601',
    settings: { deviceId: 'sink-one', volume: 0.5, muted: false },
  });
  await messageListener({
    type: 'START_CAPTURE',
    tabId: 602,
    streamId: 'stream-602',
    settings: { deviceId: 'sink-two', volume: 0.7, muted: false },
  });

  firstStream.audioTrack.end();
  await messageListener({ type: 'SET_VOLUME', tabId: 602, volume: 0.3, muted: false });

  assert.deepEqual(runtimeMessages.filter((message) => message.status === 'needs_action'), [{
    type: 'CAPTURE_STATUS',
    tabId: 601,
    status: 'needs_action',
    error: undefined,
  }]);
  assert.deepEqual(contexts[1].gainCalls.at(-1), {
    value: 0.3,
    startTime: 5,
    timeConstant: 0.1,
  });
});

test('applies boosted volume and clamps out-of-range values', async () => {
  resetFakes();
  getUserMedia = async () => new FakeStream();

  await messageListener({
    type: 'START_CAPTURE',
    tabId: 701,
    streamId: 'stream-701',
    settings: { deviceId: 'sink-a', volume: 2.5, muted: false },
  });

  assert.deepEqual(contexts[0].gainCalls, [
    { value: 2.5, startTime: 5, timeConstant: 0.1 },
  ]);

  await messageListener({
    type: 'SET_VOLUME',
    tabId: 701,
    volume: 9,
    muted: false,
  });
  assert.deepEqual(contexts[0].gainCalls.at(-1), {
    value: 5,
    startTime: 5,
    timeConstant: 0.1,
  });

  await messageListener({
    type: 'SET_VOLUME',
    tabId: 701,
    volume: 3,
    muted: true,
  });
  assert.deepEqual(contexts[0].gainCalls.at(-1), {
    value: 0,
    startTime: 5,
    timeConstant: 0.1,
  });
});
