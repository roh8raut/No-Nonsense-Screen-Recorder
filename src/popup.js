document.addEventListener("DOMContentLoaded", function () {
  const startBtn = document.getElementById("startRecording");
  const compressToggle = document.getElementById("compressToggle");

  // Load saved preference (default: true)
  chrome.storage.local.get(["compressVideo"], function (result) {
    compressToggle.checked = result.compressVideo !== false;
  });

  compressToggle.addEventListener("change", function () {
    chrome.storage.local.set({ compressVideo: compressToggle.checked });
  });

  startBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.runtime.sendMessage({
      action: "request_recording",
      message: {
        activeTabId: tab?.id ?? null,
        compressVideo: compressToggle.checked,
      },
    });
    window.close();
  });
});
