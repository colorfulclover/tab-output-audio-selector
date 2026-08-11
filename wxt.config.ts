import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: (env) => {
    const mode = env.mode || process.env.NODE_ENV || 'production';

    let nameSuffix = '';

    if (mode === 'development') {
      nameSuffix = ' (dev)';
    } else if (process.env.BUILD_TARGET === 'manual') {
      nameSuffix = ' (manual)';
    }

    const extName = nameSuffix ? `Tab Audio Selector${nameSuffix}` : '__MSG_extName__';

    return {
      default_locale: 'en',
      name: extName,
      description: '__MSG_extDescription__',
      permissions: [
        'activeTab',
        'storage',
        'tabs',
        'tabCapture',
        'offscreen',
      ],
      host_permissions: [
        '<all_urls>',
      ],
      action: {
        default_title: extName,
      },
      icons: {
        16: '/icon/16.png',
        32: '/icon/32.png',
        48: '/icon/48.png',
        128: '/icon/128.png',
      },
    };
  },
});
