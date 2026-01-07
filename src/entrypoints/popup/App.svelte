<script lang="ts">
  import { onMount } from 'svelte';
  import Header from '@/components/Header.svelte';
  import CurrentTabInfo from '@/components/CurrentTabInfo.svelte';
  import DeviceSelector from '@/components/DeviceSelector.svelte';
  import VolumeControl from '@/components/VolumeControl.svelte';
  import type { DeviceInfo, TabInfo } from '@/utils/messaging';
  import { getAudioSettings, saveAudioSettings } from '@/utils/storage';

  let currentTab: TabInfo | null = null;
  let devices: DeviceInfo[] = [];
  let selectedDeviceId: string | null = null;
  let volume: number = 1.0;
  let muted: boolean = false;
  let isLoading = true;
  let permissionDenied = false;
  let isCaptureActive = false;

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
            // If saved settings exist, we assume capture might be desired,
            // but we only start it when user interacts or if we had a persistent state logic.
            // For now, let's start capture if settings are different from default.
            if (saved.volume !== 1.0 || saved.muted || saved.deviceId !== 'default') {
                startCapture();
            }
          }
        }
      }

      // 3. Get Devices
      await loadDevices();

    } catch (e) {
      console.error('Initialization error:', e);
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
        label: d.label || (d.deviceId === 'default' ? 'Default' : `Unknown Device (${d.deviceId.slice(0, 4)}...)`)
      }));

      const hasLabels = devices.some(d => d.label && d.label !== 'Default' && !d.label.startsWith('Unknown'));
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
    applySettings();
  }

  function handleVolumeChange(event: CustomEvent<number>) {
    volume = event.detail;
    applySettings();
  }

  function handleMuteChange(event: CustomEvent<boolean>) {
    muted = event.detail;
    applySettings();
  }

  function startCapture() {
    if (!currentTab?.id) return;
    if (isCaptureActive) return;

    chrome.runtime.sendMessage({
      type: 'START_CAPTURE',
      tabId: currentTab.id
    });
    isCaptureActive = true;
  }

  async function applySettings() {
    if (!currentTab?.id) return;

    // Ensure capture is started before applying settings
    // In a robust implementation, we might check status first.
    // For now, simple state flag.
    if (!isCaptureActive) {
        startCapture();
        // Give a slight delay for capture to init (optimistic UI update is fine too)
    }

    // Send Device
    if (selectedDeviceId) {
        chrome.runtime.sendMessage({
        type: 'SET_DEVICE',
        tabId: currentTab.id,
        deviceId: selectedDeviceId
        });
    }

    // Send Volume
    chrome.runtime.sendMessage({
      type: 'SET_VOLUME',
      tabId: currentTab.id, 
      volume: volume,
      muted: muted
    });

    // Save Settings
    if (currentTab.url) {
      await saveAudioSettings(currentTab.url, {
        deviceId: selectedDeviceId || 'default',
        volume: volume,
        muted: muted
      });
    }
  }
</script>

<div class="w-[350px] min-h-[400px] bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-sans">
  <Header />
  
  <main class="p-4 space-y-6">
    {#if isLoading}
      <div class="flex justify-center py-8">
        <span class="text-gray-500">Loading...</span>
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
            Permission needed to see device names.
          </p>
          <button 
            on:click={requestPermission}
            class="text-xs px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-full transition-colors"
          >
            Grant Permission
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
        No active tab found.
      </div>
    {/if}
  </main>
</div>

<style>
  /* Global styles or resets if needed */
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
