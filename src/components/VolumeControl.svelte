<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let volume: number = 1.0; // 0.0 to 1.0
  export let muted: boolean = false;
  export let disabled = false;

  const dispatch = createEventDispatcher<{ 
    volumeChange: number;
    muteChange: boolean;
  }>();

  function handleSliderChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const newVal = parseFloat(target.value);
    dispatch('volumeChange', newVal);
  }

  function toggleMute() {
    dispatch('muteChange', !muted);
  }
</script>

<div class="volume-control space-y-2">
  <div class="flex items-center justify-between">
    <label for="volume-slider" class="text-sm font-medium text-gray-700 dark:text-gray-300">Volume</label>
    <span class="text-xs text-gray-500 dark:text-gray-400">{Math.round(volume * 100)}%</span>
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
    
    <input
      id="volume-slider"
      type="range"
      min="0"
      max="1"
      step="0.01"
      class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
      value={volume}
      on:input={handleSliderChange}
      {disabled}
    />
  </div>
</div>

