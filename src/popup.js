document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM content loaded and parsed!");
  const startBtn = document.getElementById("startRecording");
  // const audioToggle = document.getElementById("audioToggle");

  // Load saved audio preference
  // chrome.storage.local.get(['recordAudio'], function(result) {
  //   audioToggle.checked = result.recordAudio !== false; // Default to true if not set
  // });

  // // Save audio preference when toggled
  // audioToggle.addEventListener('change', function() {
  //   chrome.storage.local.set({ recordAudio: audioToggle.checked });
  // });

  startBtn.addEventListener("click", () => {


    // const recordAudio = audioToggle.checked;
    
    // Send message with audio preference
    chrome.runtime.sendMessage({
      action: "request_recording",

      message: { 
        activeTabId: null,
        // recordAudio: recordAudio
      },
    });
    
    // Close the popup
    window.close();
  });
});
