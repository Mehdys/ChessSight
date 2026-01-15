console.log("ChessSight Background Script - Safari Compatible Mode");

// Minimal message routing for popup <-> content script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Message received:', message);

  // If message comes from popup (no tab info), forward to active tab's content script
  if (!sender.tab) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
  }

  // Always return true for async response handling
  return true;
});

console.log('[Background] Message routing enabled');
