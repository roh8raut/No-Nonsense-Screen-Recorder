document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM content loaded and parsed!");
  const startBtn = document.getElementById("startRecording");

  startBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.runtime.sendMessage({
        action: "request_recording",
        message: { activeTabId: tabs.find((tab) => tab.active)?.id },
      });
    });
  });
});
