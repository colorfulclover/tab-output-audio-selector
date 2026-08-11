<script lang="ts">
  import { onMount } from 'svelte';
  import Header from '@/components/Header.svelte';
  import Footer from '@/components/Footer.svelte';
  import CurrentTabInfo from '@/components/CurrentTabInfo.svelte';
  import DeviceSelector from '@/components/DeviceSelector.svelte';
  import VolumeControl from '@/components/VolumeControl.svelte';
  import type { DeviceInfo, TabInfo } from '@/utils/messaging';
  import { getAudioSettings, saveAudioSettings } from '@/utils/storage';
  import { t } from '@/utils/i18n';

  let currentTab: TabInfo | null = null;
  let devices: DeviceInfo[] = [];
  let selectedDeviceId: string | null = null;
  let volume: number = 1.0;
  let muted: boolean = false;
  let isLoading = true;
  let permissionDenied = false;
  let status: 'Ready' | 'Capturing' | 'Error' = 'Ready';

  onMount(async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        const tab = tabs[0];
        currentTab = {
          id: tab.id!,
          title: tab.title || '',
          url: tab.url || '',
          favIconUrl: tab.favIconUrl
        };

        if (currentTab.url) {
          const saved = await getAudioSettings(currentTab.url);
          if (saved) {
            selectedDeviceId = saved.deviceId;
            volume = saved.volume;
            muted = saved.muted;

            if (saved.volume !== 1.0 || saved.muted || saved.deviceId !== 'default') {
              await applySettings({ persist: false });
            }
          }
        }
      }

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
      window.close();
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

  async function applySettings(options: { persist?: boolean } = {}) {
    const { persist = true } = options;
    if (!currentTab?.id) return;

    status = 'Capturing';

    // Background ensures Offscreen + capture, then applies these settings.
    if (selectedDeviceId) {
      await chrome.runtime.sendMessage({
        type: 'SET_DEVICE',
        tabId: currentTab.id,
        deviceId: selectedDeviceId
      });
    }

    await chrome.runtime.sendMessage({
      type: 'SET_VOLUME',
      tabId: currentTab.id,
      volume,
      muted
    });

    if (persist && currentTab.url) {
      await saveAudioSettings(currentTab.url, {
        deviceId: selectedDeviceId || 'default',
        volume,
        muted
      });
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
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
