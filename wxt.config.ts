import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig((env) => {
  // Determine name suffix based on build mode and target
  // env might be undefined in some contexts, so fallback safely
  const mode = env?.mode || process.env.NODE_ENV || 'production';
  
  let nameSuffix = "";
  
  if (mode === 'development') {
    nameSuffix = " (dev)";
  } else if (process.env.BUILD_TARGET === 'manual') {
    nameSuffix = " (manual)";
  }

  // If suffix exists, use hardcoded name with suffix. Otherwise use i18n key.
  const extName = nameSuffix ? `Tab Audio Selector${nameSuffix}` : "__MSG_extName__";

  return {
    srcDir: 'src',
    modules: ['@wxt-dev/module-svelte'],
    manifest: {
      default_locale: "ja",
      name: extName,
      description: "__MSG_extDescription__",
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
        default_title: extName
      },
      icons: {
        16: '/icon/16.png',
        32: '/icon/32.png',
        48: '/icon/48.png',
        128: '/icon/128.png',
      }
    }
  };
});
