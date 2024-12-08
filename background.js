console.log("Hello this is background.js :)");

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "request_recording") {
    // Create recording screen tab
    const tab = await chrome.tabs.create({
      url: chrome.runtime.getURL("extension-page.html"),
      pinned: true,
      active: true,
    });

    // Wait for recording screen tab to be loaded and send message to it with the currentTab
    chrome.tabs.onUpdated.addListener(async function listener(tabId, info) {
      if (tabId === tab.id && info.status === "complete") {
        await chrome.tabs.sendMessage(tabId, {
          name: "request_recording",
          data: {
            activeTabId: request.message.activeTabId,
            chromePinnedExtenstionTabId: tabId,
          },
        });
        chrome.tabs.onUpdated.removeListener(listener);
      }
    });
  }
});
