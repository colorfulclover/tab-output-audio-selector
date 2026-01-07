<script lang="ts">
  const year = new Date().getFullYear();
  const version = chrome.runtime.getManifest().version;
  
  export let status: 'Ready' | 'Capturing' | 'Error' = 'Ready';
</script>

<footer class="mt-auto pt-4 pb-2 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400 flex justify-between px-4 items-center">
  <div class="flex items-center gap-2">
    <span class={`w-2 h-2 rounded-full ${status === 'Capturing' ? 'bg-green-500 animate-pulse' : status === 'Error' ? 'bg-red-500' : 'bg-gray-400'}`}></span>
    <span>{status}</span>
  </div>
  <p>Tab Audio Selector v{version} © {year} colorfulclover</p>
</footer>

