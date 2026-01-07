<script lang="ts">
  export let title: string = '';
  export let url: string = '';
  export let favIconUrl: string = '';
</script>

<div class="current-tab-info flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
  {#if favIconUrl}
    <img src={favIconUrl} alt="Favicon" class="w-8 h-8 rounded-sm" />
  {:else}
    <div class="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-sm flex items-center justify-center">
      <span class="text-xs">Tab</span>
    </div>
  {/if}
  
  <div class="flex-1 min-w-0">
    <h3 class="text-sm font-medium text-gray-900 dark:text-white truncate" title={title}>
      {title || 'Unknown Tab'}
    </h3>
    <p class="text-xs text-gray-500 dark:text-gray-400 truncate" title={url}>
      {url || 'No URL'}
    </p>
  </div>
</div>

