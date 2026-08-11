<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Header from '@/components/Header.svelte';
  import Footer from '@/components/Footer.svelte';
  import CurrentTabInfo from '@/components/CurrentTabInfo.svelte';
  import DeviceSelector from '@/components/DeviceSelector.svelte';
  import VolumeControl from '@/components/VolumeControl.svelte';
  import type { CaptureResult, DeviceInfo, ExtensionMessage, TabInfo } from '@/utils/messaging';
  import { hasNonDefaultAudioSettings } from '@/utils/capture-settings';
  import { getAudioSettings, saveAudioSettings } from '@/utils/storage';
  import { t } from '@/utils/i18n';

  let currentTab: TabInfo | null = null;
  let devices: DeviceInfo[] = [];
  let selectedDeviceId: string | null = null;
  let volume: number = 1.0;
  let muted: boolean = false;
  let isLoading = true;
  let permissionDenied = false;
  let capturePromise: Promise<boolean> | null = null;
  let status: 'Ready' | 'Restoring' | 'Capturing' | 'NeedsAction' | 'Error' = 'Ready';

  function handleRuntimeMessage(message: ExtensionMessage) {
    if (message.type !== 'CAPTURE_STATUS' || message.tabId !== currentTab?.id) return;

    applyCaptureResult({ status: message.status, error: message.error });
  }

  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  onDestroy(() => chrome.runtime.onMessage.removeListener(handleRuntimeMessage));

  onMount(async () => {
    try {
      // 1. Get Active Tab Info
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        const tab = tabs[0];
        currentTab = {
          id: tab.id!,
          title: tab.title || '',
          url: tab.url || '',
          favIconUrl: tab.favIconUrl
        };

        // 2. Load Saved Settings
        if (currentTab.url) {
          const saved = await getAudioSettings(currentTab.url);
          if (saved) {
            selectedDeviceId = saved.deviceId;
            volume = saved.volume;
            muted = saved.muted;
            if (hasNonDefaultAudioSettings(saved)) {
              await startCapture();
            }
          }
        }
      }

      // 3. Get Devices
      await loadDevices();

    } catch (e) {
      console.error('Initialization error:', e);
      status = 'Error';
    } finally {
      isLoading = false;
    }
  });

  async function loadDevices() {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = deviceList.filter(d => d.kind === 'audiooutput');
      
      devices = audioOutputs.map(d => ({
        deviceId: d.deviceId,
        label: d.label || (d.deviceId === 'default' ? t('defaultDevice') : `${t('unknownDevice')} (${d.deviceId.slice(0, 4)}...)`)
      }));

      const hasLabels = devices.some(d => d.label && d.label !== t('defaultDevice') && !d.label.startsWith(t('unknownDevice')));
      permissionDenied = !hasLabels && devices.length > 0;

    } catch (e) {
      console.error('Failed to enumerate devices:', e);
    }
  }

  async function requestPermission() {
    try {
      await chrome.tabs.create({ url: chrome.runtime.getURL('permissions.html') });
      window.close(); // Close popup
    } catch (e) {
      console.error('Failed to open permission page:', e);
    }
  }

  function handleDeviceChange(event: CustomEvent<string>) {
    selectedDeviceId = event.detail;
    void applySettings();
  }

  function handleVolumeChange(event: CustomEvent<number>) {
    volume = event.detail;
    void applySettings();
  }

  function handleMuteChange(event: CustomEvent<boolean>) {
    muted = event.detail;
    void applySettings();
  }

  function applyCaptureResult(result: CaptureResult | undefined): boolean {
    if (result?.status === 'active') {
      status = 'Capturing';
      return true;
    }

    status = result?.status === 'needs_action' ? 'NeedsAction' :
      result?.status === 'pending' ? 'Restoring' : 'Error';
    return false;
  }

  async function startCapture(): Promise<boolean> {
    if (!currentTab?.id) return false;
    if (capturePromise) return capturePromise;

    status = 'Restoring';
    const tabId = currentTab.id;
    capturePromise = (async () => {
      try {
        const result = await chrome.runtime.sendMessage({
          type: 'START_CAPTURE',
          tabId,
        } satisfies ExtensionMessage) as CaptureResult | undefined;
        return applyCaptureResult(result);
      } catch (error) {
        console.error('Failed to start capture:', error);
        return applyCaptureResult({ status: 'error', error: String(error) });
      }
    })();

    try {
      return await capturePromise;
    } finally {
      capturePromise = null;
    }
  }

  async function applySettings() {
    if (!currentTab?.id) return;

    const captureReady = await startCapture();

    if (!captureReady) return;

    try {
      const deviceResult = await chrome.runtime.sendMessage({
        type: 'SET_DEVICE',
        tabId: currentTab.id,
        deviceId: selectedDeviceId || 'default',
      } satisfies ExtensionMessage) as CaptureResult | undefined;

      if (!applyCaptureResult(deviceResult)) return;

      const volumeResult = await chrome.runtime.sendMessage({
        type: 'SET_VOLUME',
        tabId: currentTab.id,
        volume,
        muted,
      } satisfies ExtensionMessage) as CaptureResult | undefined;

      if (!applyCaptureResult(volumeResult)) return;

      if (currentTab.url) {
        await saveAudioSettings(currentTab.url, {
          deviceId: selectedDeviceId || 'default',
          volume: volume,
          muted: muted
        });
      }
    } catch (error) {
      console.error('Failed to apply capture settings:', error);
      applyCaptureResult({ status: 'error', error: String(error) });
    }
  }
</script>

<div class="w-[350px] min-h-[400px] bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-sans flex flex-col">
  <Header />
  
  <main class="p-4 space-y-6 flex-grow">
    {#if isLoading}
      <div class="flex justify-center py-8">
        <span class="text-gray-500">{t('loading')}</span>
      </div>
    {:else if currentTab}
      <CurrentTabInfo 
        title={currentTab.title} 
        url={currentTab.url} 
        favIconUrl={currentTab.favIconUrl || ''} 
      />

      {#if permissionDenied}
        <div class="p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-md">
          <p class="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
            {t('permissionNeeded')}
          </p>
          <button 
            on:click={requestPermission}
            class="text-xs px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-full transition-colors"
          >
            {t('grantPermission')}
          </button>
        </div>
      {/if}

      <div class="space-y-4">
        <DeviceSelector 
          {devices} 
          {selectedDeviceId} 
          disabled={permissionDenied && devices.length <= 1} 
          on:change={handleDeviceChange}
        />
        
        <VolumeControl 
          {volume} 
          {muted} 
          on:volumeChange={handleVolumeChange}
          on:muteChange={handleMuteChange}
        />
      </div>
    {:else}
      <div class="text-center py-8 text-gray-500">
        {t('noActiveTab')}
      </div>
    {/if}
  </main>
  
  <Footer {status} />
</div>

<style>
  /* Global styles or resets if needed */
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
