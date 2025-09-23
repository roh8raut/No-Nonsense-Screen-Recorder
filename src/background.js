console.log("Hello this is background.js :)");

let extensionPageReady = false;
let pendingMessage = null;

// Listen for extension page ready signal
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extension_page_ready") {
    extensionPageReady = true;
    // If we have a pending message, send it now
    if (pendingMessage) {
      chrome.tabs.sendMessage(pendingMessage.tabId, pendingMessage.message);
      pendingMessage = null;
    }
  }
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "request_recording") {
    try {
      // Create recording screen tab
      const tab = await chrome.tabs.create({
        url: chrome.runtime.getURL("src/extension-page.html"),
        pinned: true,
        active: true,
      });

      // Function to send the message
      const sendMessageToTab = async (tabId) => {
        try {
          await chrome.tabs.sendMessage(tabId, {
            name: "request_recording",
            data: {
              activeTabId: request.message.activeTabId,
              chromePinnedExtenstionTabId: tabId,
            },
          });
        } catch (error) {
          console.error("Error sending message to tab:", error);
          // Store the message to send when the page is ready
          pendingMessage = {
            tabId: tabId,
            message: {
              name: "request_recording",
              data: {
                activeTabId: request.message.activeTabId,
                chromePinnedExtenstionTabId: tabId,
              },
            }
          };
        }
      };

      // Wait for tab to be fully loaded
      chrome.tabs.onUpdated.addListener(async function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          // Small delay to ensure content script is loaded
          setTimeout(() => {
            sendMessageToTab(tabId);
          }, 100);
        }
      });
    } catch (error) {
      console.error("Error in request_recording handler:", error);
    }
  }
});
