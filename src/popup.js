document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startRecording");
  const stopBtn = document.getElementById("stopRecording");

  refresh();

  startBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "request_recording" });
    window.close(); // share dialog takes focus; popup closes on its own anyway
  });

  stopBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ target: "offscreen", type: "stop" });
    window.close();
  });

  // Show Stop instead of Start while a recording is in progress.
  async function refresh() {
    const { recording } = await chrome.storage.session.get("recording");
    startBtn.hidden = recording === true;
    stopBtn.hidden = recording !== true;
  }
});
