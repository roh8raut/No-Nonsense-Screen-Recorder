chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "request_recording") {
    handleRecordingRequest(request.message);
  }
});

async function handleRecordingRequest(message) {
  try {
    const tab = await chrome.tabs.create({
      url: chrome.runtime.getURL("src/extension-page.html"),
      pinned: true,
      active: true,
    });

    await waitForTabReady(tab.id);

    await chrome.tabs.sendMessage(tab.id, {
      name: "request_recording",
      data: {
        activeTabId: message.activeTabId,
        compressVideo: message.compressVideo,
        chromePinnedExtenstionTabId: tab.id,
      },
    });
  } catch (error) {
    console.error("Error in handleRecordingRequest:", error);
  }
}

function waitForTabReady(tabId) {
  return new Promise((resolve) => {
    const onMessage = (request, sender) => {
      if (request.action === "extension_page_ready" && sender.tab?.id === tabId) {
        chrome.runtime.onMessage.removeListener(onMessage);
        resolve();
      }
    };
    chrome.runtime.onMessage.addListener(onMessage);
  });
}
