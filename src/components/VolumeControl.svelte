<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from '@/utils/i18n';
  import { VOLUME_DEFAULT, VOLUME_MAX, VOLUME_MIN, clampVolume } from '@/utils/volume';

  export let volume: number = VOLUME_DEFAULT;
  export let muted: boolean = false;
  export let disabled = false;

  const dispatch = createEventDispatcher<{ 
    volumeChange: number;
    muteChange: boolean;
  }>();

  $: isBoosted = volume > VOLUME_DEFAULT;
  $: markerPercent = (VOLUME_DEFAULT / VOLUME_MAX) * 100;

  function handleSliderChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const newVal = clampVolume(parseFloat(target.value));
    dispatch('volumeChange', newVal);
  }

  function toggleMute() {
    dispatch('muteChange', !muted);
  }
</script>

<div class="volume-control space-y-2">
  <div class="flex items-center justify-between">
    <label for="volume-slider" class="text-sm font-medium text-gray-700 dark:text-gray-300">{t('volume')}</label>
    <span class="text-xs {isBoosted ? 'text-amber-600 dark:text-amber-500 font-medium' : 'text-gray-500 dark:text-gray-400'}">
      {Math.round(volume * 100)}%
    </span>
  </div>
  
  <div class="flex items-center space-x-3">
    <button
      type="button"
      class="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
      on:click={toggleMute}
      {disabled}
      aria-label={muted ? "Unmute" : "Mute"}
    >
      {#if muted || volume === 0}
        <!-- Mute Icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      {:else}
        <!-- Volume Icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      {/if}
    </button>
    
    <div class="relative w-full">
      <div
        class="pointer-events-none absolute top-1/2 z-10 h-3 w-0.5 -translate-y-1/2 rounded-sm bg-gray-400 dark:bg-gray-500"
        style="left: {markerPercent}%"
        aria-hidden="true"
        title="100%"
      ></div>
      <input
        id="volume-slider"
        type="range"
        min={VOLUME_MIN}
        max={VOLUME_MAX}
        step="0.01"
        class="volume-slider w-full h-2 rounded-lg appearance-none cursor-pointer {isBoosted ? 'volume-slider--boosted' : ''}"
        value={volume}
        on:input={handleSliderChange}
        {disabled}
      />
    </div>
  </div>
</div>

<style>
  .volume-slider {
    background: linear-gradient(
      to right,
      #e5e7eb 0%,
      #e5e7eb 20%,
      #fde68a 20%,
      #fde68a 100%
    );
  }

  :global(.dark) .volume-slider {
    background: linear-gradient(
      to right,
      #374151 0%,
      #374151 20%,
      #78350f 20%,
      #78350f 100%
    );
  }

  .volume-slider--boosted {
    background: linear-gradient(
      to right,
      #e5e7eb 0%,
      #e5e7eb 20%,
      #fbbf24 20%,
      #fbbf24 100%
    );
  }

  :global(.dark) .volume-slider--boosted {
    background: linear-gradient(
      to right,
      #374151 0%,
      #374151 20%,
      #d97706 20%,
      #d97706 100%
    );
  }
</style>
