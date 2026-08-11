// i18n helper
export {};

function t(key: string): string {
  return chrome.i18n.getMessage(key);
}

document.addEventListener('DOMContentLoaded', () => {
  // Translate static content
  document.title = t('permissionPageTitle');
  
  const titleEl = document.querySelector('h1');
  if (titleEl) titleEl.textContent = t('permissionPageTitle');
  
  const descEl = document.querySelector('p:first-of-type');
  if (descEl) descEl.textContent = t('permissionPageDesc');
  
  const btnEl = document.getElementById('requestPermissionBtn');
  if (btnEl) btnEl.textContent = t('grantPermission');

  const statusMessage = document.getElementById('statusMessage');

  if (btnEl && statusMessage) {
    btnEl.addEventListener('click', async () => {
      // Loading state (optional, or reuse loading message if defined)
      statusMessage.textContent = '...'; 
      statusMessage.className = 'message';
      
      try {
        // Request microphone permission to get device labels
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        stream.getTracks().forEach(track => track.stop()); // Stop tracks immediately

        statusMessage.textContent = t('permissionGranted');
        statusMessage.className = 'message success';

        // After a short delay, close the tab
        setTimeout(() => {
          chrome.tabs.getCurrent().then(tab => {
            if (tab?.id) {
              chrome.tabs.remove(tab.id);
            }
          });
        }, 2000);

      } catch (error: any) {
        // Show detailed error message
        statusMessage.textContent = `${t('permissionDenied')} (${error.name || 'UnknownError'}: ${error.message || 'No details'})`;
        statusMessage.className = 'message error';
        console.error('Permission request failed:', error);
      }
    });
  }
});
