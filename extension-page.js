chrome.runtime.onMessage.addListener((message) => {
  if (message.name == "request_recording") {
    const { activeTabId, chromePinnedExtenstionTabId } = message.data;

    startRecording({ activeTabId, chromePinnedExtenstionTabId });
  }
});

let mediaRecorder;
let recordedChunks = [];

async function startRecording({ activeTabId, chromePinnedExtenstionTabId }) {
  try {
    chrome.desktopCapture.chooseDesktopMedia(
      ["screen", "window", "tab"],
      async function (streamId) {
        try {
          if (streamId == null) {
            return;
          }

          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: streamId,
              },
            },
          });

          mediaRecorder = new MediaRecorder(stream);

          mediaRecorder.ondataavailable = (event) => {
            recordedChunks.push(event.data);
          };

          mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, {
              type: "video/webm",
            });
            const blobUrl = URL.createObjectURL(blob);

            downloadRecording(blobUrl, chromePinnedExtenstionTabId);
          };

          mediaRecorder.start();

          chrome.tabs.update(activeTabId, { active: true });

          document.getElementById("status").textContent =
            "Recording started...";
        } catch (error) {
          document.getElementById("status").textContent =
            "recording permission denied";
          console.log("recording permission denied;");
        }
      }
    );
  } catch (err) {
    console.error("Error starting screen recording:", err);
  }
}

async function downloadRecording(url, chromePinnedExtenstionTabId) {
  chrome.downloads.download(
    {
      url: url,
      filename: "screen_recording.webm",
      saveAs: true,
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("Download failed: " + chrome.runtime.lastError.message);
      } else {
        console.log("Download started with ID: " + downloadId, url);
      }
    }
  );

  setTimeout(() => {
    URL.revokeObjectURL(url);

    // close the extension tab
    chrome.tabs.remove(chromePinnedExtenstionTabId, () => {
      console.log(`Closed pinned tab with ID: ${tabToClose.id}`);
    });
  }, 100);

  //
  document.getElementById("status").textContent = "Recording downloaded";
}
