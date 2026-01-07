// Content script is no longer needed for V2 architecture (Tab Capture API)
// Keeping this file as a placeholder if we need page-context features later.

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    // No-op
  },
});
