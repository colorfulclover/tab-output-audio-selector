import assert from 'node:assert/strict';
import { test } from 'vitest';

import { createCaptureLifecycle } from '../src/utils/capture-lifecycle.ts';

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function createHarness(overrides = {}) {
  const calls = {
    cleared: [],
    marked: [],
    media: [],
    offscreen: [],
    delays: 0,
  };
  let capturedTabs = [...(overrides.capturedTabs ?? [])];
  const settingsByUrl = overrides.settingsByUrl ?? new Map();
  const dependencies = {
    queryTabs: async () => overrides.tabs ?? [],
    getCapturedTabs: async () => {
      if (overrides.getCapturedTabs) return overrides.getCapturedTabs();
      return capturedTabs;
    },
    getAudioSettings: async (url) => settingsByUrl.get(url) ?? null,
    loadCaptureSettings: async (tabId) => {
      if (overrides.loadCaptureSettings) return overrides.loadCaptureSettings(tabId);
      return { deviceId: 'sink-a', volume: 0.4, muted: true };
    },
    getMediaStreamId: async (tabId) => {
      calls.media.push(tabId);
      if (overrides.getMediaStreamId) return overrides.getMediaStreamId(tabId);
      return `stream-${tabId}`;
    },
    startOffscreenCapture: async (tabId, streamId, settings) => {
      calls.offscreen.push({ tabId, streamId, settings });
      if (overrides.startOffscreenCapture) {
        return overrides.startOffscreenCapture(tabId, streamId, settings);
      }
      return { status: 'active' };
    },
    markNeedsAction: async (tabId) => {
      calls.marked.push(tabId);
    },
    clearIndicator: async (tabId) => {
      calls.cleared.push(tabId);
    },
    delay: async () => {
      calls.delays += 1;
      if (overrides.onDelay) await overrides.onDelay(calls.delays);
    },
  };

  return {
    calls,
    setCapturedTabs: (tabs) => {
      capturedTabs = tabs;
    },
    lifecycle: createCaptureLifecycle(dependencies),
  };
}

test('cold startup marks non-default settings without requesting a stream', async () => {
  const settingsByUrl = new Map([
    ['https://audio.example/', { deviceId: 'sink-a', volume: 1, muted: false }],
  ]);
  const { calls, lifecycle } = createHarness({
    tabs: [{ id: 1, url: 'https://audio.example/' }],
    settingsByUrl,
  });

  await lifecycle.handleStartup();

  assert.deepEqual(calls.marked, [1]);
  assert.deepEqual(calls.media, []);
  assert.deepEqual(calls.offscreen, []);
});

test('cold startup does not mark default settings', async () => {
  const settingsByUrl = new Map([
    ['https://default.example/', { deviceId: 'default', volume: 1, muted: false }],
  ]);
  const { calls, lifecycle } = createHarness({
    tabs: [{ id: 2, url: 'https://default.example/' }],
    settingsByUrl,
  });

  await lifecycle.handleStartup();

  assert.deepEqual(calls.marked, []);
  assert.deepEqual(calls.cleared, [2]);
  assert.deepEqual(calls.media, []);
});

test('startup indicators stay isolated per tab and ignore active captures', async () => {
  const settingsByUrl = new Map([
    ['https://one.example/', { deviceId: 'sink-one', volume: 1, muted: false }],
    ['https://two.example/', { deviceId: 'default', volume: 1, muted: false }],
    ['https://three.example/', { deviceId: 'sink-three', volume: 0.5, muted: false }],
  ]);
  const { calls, lifecycle } = createHarness({
    tabs: [
      { id: 11, url: 'https://one.example/' },
      { id: 22, url: 'https://two.example/' },
      { id: 33, url: 'https://three.example/' },
    ],
    capturedTabs: [{ tabId: 33, status: 'active' }],
    settingsByUrl,
  });

  await lifecycle.handleStartup();

  assert.deepEqual(calls.marked, [11]);
  assert.deepEqual(calls.cleared.sort((a, b) => a - b), [22, 33]);
});

test('one user action coalesces concurrent requests and restores saved settings', async () => {
  const media = createDeferred();
  const restored = { deviceId: 'sink-restored', volume: 0.35, muted: true };
  const { calls, lifecycle } = createHarness({
    getMediaStreamId: () => media.promise,
    loadCaptureSettings: async () => restored,
  });

  const first = lifecycle.startCapture(42);
  const second = lifecycle.startCapture(42);
  media.resolve('stream-42');

  assert.deepEqual(await Promise.all([first, second]), [
    { status: 'active' },
    { status: 'active' },
  ]);
  assert.deepEqual(calls.media, [42]);
  assert.deepEqual(calls.offscreen, [{
    tabId: 42,
    streamId: 'stream-42',
    settings: restored,
  }]);
  assert.deepEqual(calls.cleared, [42]);
});

test('capture authorization failures keep Needs action and return an error', async () => {
  const { calls, lifecycle } = createHarness({
    getMediaStreamId: async () => {
      throw new Error('Extension has not been invoked for the current page');
    },
  });

  const result = await lifecycle.startCapture(51);

  assert.equal(result.status, 'error');
  assert.match(result.error, /has not been invoked/);
  assert.deepEqual(calls.marked, [51]);
  assert.deepEqual(calls.offscreen, []);
});

test('offscreen stream failures keep Needs action and propagate the result', async () => {
  const { calls, lifecycle } = createHarness({
    startOffscreenCapture: async () => ({
      status: 'error',
      error: 'getUserMedia failed',
    }),
  });

  const result = await lifecycle.startCapture(61);

  assert.deepEqual(result, { status: 'error', error: 'getUserMedia failed' });
  assert.deepEqual(calls.marked, [61]);
});

test('service worker restart reuses an active capture without requesting a stream', async () => {
  const { calls, lifecycle } = createHarness({
    capturedTabs: [{ tabId: 71, status: 'active' }],
  });

  assert.deepEqual(await lifecycle.startCapture(71), { status: 'active' });
  assert.deepEqual(calls.media, []);
  assert.deepEqual(calls.offscreen, []);
  assert.deepEqual(calls.cleared, [71]);
});

test('stale pending capture becomes needs_action without starting a stream', async () => {
  const { calls, lifecycle } = createHarness({
    capturedTabs: [{ tabId: 72, status: 'pending' }],
  });

  assert.deepEqual(await lifecycle.startCapture(72), { status: 'needs_action' });
  assert.equal(calls.delays, 5);
  assert.deepEqual(calls.marked, [72]);
  assert.deepEqual(calls.media, []);
  assert.deepEqual(calls.offscreen, []);
});

test('pending capture that becomes active is reused', async () => {
  const { calls, setCapturedTabs, lifecycle } = createHarness({
    capturedTabs: [{ tabId: 73, status: 'pending' }],
    onDelay: async (attempt) => {
      if (attempt === 2) {
        setCapturedTabs([{ tabId: 73, status: 'active' }]);
      }
    },
  });

  assert.deepEqual(await lifecycle.startCapture(73), { status: 'active' });
  assert.equal(calls.delays, 2);
  assert.deepEqual(calls.cleared, [73]);
  assert.deepEqual(calls.media, []);
  assert.deepEqual(calls.offscreen, []);
});

test('pending capture that clears retries a fresh start', async () => {
  const { calls, setCapturedTabs, lifecycle } = createHarness({
    capturedTabs: [{ tabId: 74, status: 'pending' }],
    onDelay: async (attempt) => {
      if (attempt === 1) {
        setCapturedTabs([]);
      }
    },
  });

  assert.deepEqual(await lifecycle.startCapture(74), { status: 'active' });
  assert.equal(calls.delays, 1);
  assert.deepEqual(calls.media, [74]);
  assert.equal(calls.offscreen.length, 1);
});

test('ended or failed capture status restores the Needs action marker', async () => {
  const { calls, lifecycle } = createHarness();

  await lifecycle.handleCaptureStatus(81, 'needs_action');
  await lifecycle.handleCaptureStatus(82, 'error');

  assert.deepEqual(calls.marked, [81, 82]);
});
