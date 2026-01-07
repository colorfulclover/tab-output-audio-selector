<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '@/utils/i18n';
  
  export let devices: { deviceId: string; label: string }[] = [];
  export let selectedDeviceId: string | null = null;
  export let disabled = false;

  const dispatch = createEventDispatcher<{ change: string }>();

  function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    dispatch('change', target.value);
  }
</script>

<div class="device-selector">
  <label for="device-select" class="text-sm font-medium text-gray-700 dark:text-gray-300">{t('outputDevice')}</label>
  <select
    id="device-select"
    class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
    value={selectedDeviceId || ''}
    on:change={handleChange}
    {disabled}
  >
    <option value="">{t('defaultDevice')}</option>
    {#each devices as device}
      <option value={device.deviceId}>{device.label}</option>
    {/each}
  </select>
</div>

