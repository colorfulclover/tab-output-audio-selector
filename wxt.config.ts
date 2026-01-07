import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    permissions: [
      "activeTab",
      "storage",
      "tabs",
      "tabCapture",
      "offscreen"
    ],
    host_permissions: [
      "<all_urls>"
    ],
    action: {
      default_title: "Tab Audio Selector"
    },
    icons: {
      16: '/icon/16.png',
      32: '/icon/32.png',
      48: '/icon/48.png',
      128: '/icon/128.png',
    }
  }
});
