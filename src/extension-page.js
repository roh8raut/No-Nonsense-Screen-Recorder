// Set up the message listener immediately when the script loads
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.name == "request_recording") {
    const { activeTabId, chromePinnedExtenstionTabId, compressVideo: shouldCompress } = message.data;
    startRecording({ activeTabId, chromePinnedExtenstionTabId, shouldCompress });
  }
});

// Signal that the page is ready
chrome.runtime.sendMessage({ action: "extension_page_ready" });

let mediaRecorder;
let recordedChunks = [];

// Helper function to update status with appropriate styling
function updateStatus(text, className = "") {
  const statusElement = document.getElementById("status");
  statusElement.textContent = text;

  // Remove all status classes
  statusElement.classList.remove("error", "recording", "compressing");

  // Add the new class if provided
  if (className) {
    statusElement.classList.add(className);
  }
}

async function startRecording({ activeTabId, chromePinnedExtenstionTabId, shouldCompress }) {
  try {
    chrome.desktopCapture.chooseDesktopMedia(
      ["screen", "window", "tab"],
      async function (streamId) {
        try {
          if (streamId == null) {
            // User declined — close the extension tab
            chrome.tabs.remove(chromePinnedExtenstionTabId);
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

          // Configure MediaRecorder with compression options
          const options = {
            mimeType: "video/webm;codecs=vp9",
            videoBitsPerSecond: 1000000, // 1 Mbps for compression
          };

          // Check if the codec is supported
          if (MediaRecorder.isTypeSupported(options.mimeType)) {
            mediaRecorder = new MediaRecorder(stream, options);
          } else {
            // Fallback to default
            mediaRecorder = new MediaRecorder(stream);
          }

          mediaRecorder.ondataavailable = (event) => {
            recordedChunks.push(event.data);
          };

          mediaRecorder.onstop = async () => {
            let blob = new Blob(recordedChunks, {
              type: "video/webm",
            });

            // Check if blob is larger than 10MB
            const MAX_SIZE = 10 * 1024 * 1024; // 10MB in bytes

            if (blob.size > MAX_SIZE) {
              if (shouldCompress) {
                updateStatus("Compressing video...", "compressing");
                blob = await compressVideo(blob, MAX_SIZE);
              } else {
                const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
                updateStatus(`Recording too large (${sizeMB}MB). Max allowed is 10MB. Try a shorter recording.`, "error");
                recordedChunks = [];
                return;
              }
            }

            const blobUrl = URL.createObjectURL(blob);
            downloadRecording(blobUrl, chromePinnedExtenstionTabId);
          };

          // Start recording
          mediaRecorder.start(1000);
          chrome.tabs.update(activeTabId, { active: true });
          updateStatus("Recording...", "recording");
        } catch (error) {
          console.error("Error starting recording:", error);
          updateStatus("Error: " + (error.message || error), "error");
          chrome.tabs.remove(chromePinnedExtenstionTabId);
        }
      }
    );
  } catch (error) {
    console.error("Error in startRecording:", error);
    updateStatus("Error: " + (error.message || error), "error");
  }
}

async function compressVideo(originalBlob, targetSize) {
  try {
    // Create video element to load the original video
    const video = document.createElement("video");
    video.src = URL.createObjectURL(originalBlob);
    video.muted = true;

    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });

    // Calculate compression ratio
    const compressionRatio = targetSize / originalBlob.size;

    // Create canvas for re-encoding
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Reduce resolution based on compression needs
    const scaleFactor = Math.sqrt(compressionRatio);
    canvas.width = video.videoWidth * Math.min(scaleFactor, 1);
    canvas.height = video.videoHeight * Math.min(scaleFactor, 1);

    // Calculate dynamic bitrate
    const duration = video.duration;
    const targetBitrate = Math.floor(((targetSize * 8) / duration) * 0.8); // 80% of theoretical max

    // Set up new media recorder with lower quality
    const canvasStream = canvas.captureStream(30); // 30 fps
    const options = {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: Math.min(targetBitrate, 500000), // Max 500kbps
    };

    const compressedChunks = [];
    const compressRecorder = new MediaRecorder(canvasStream, options);

    compressRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        compressedChunks.push(event.data);
      }
    };

    return new Promise((resolve) => {
      compressRecorder.onstop = () => {
        const compressedBlob = new Blob(compressedChunks, {
          type: "video/webm",
        });
        URL.revokeObjectURL(video.src);
        resolve(compressedBlob);
      };

      compressRecorder.start();
      video.play();

      // Draw video frames to canvas
      const drawFrame = () => {
        if (!video.ended) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(drawFrame);
        } else {
          compressRecorder.stop();
        }
      };

      video.onplay = drawFrame;
    });
  } catch (error) {
    console.error("Compression failed:", error);
    updateStatus("Compression failed, using original", "error");
    return originalBlob;
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
      console.log(`Closed pinned tab with ID: ${chromePinnedExtenstionTabId}`);
    });
  }, 100);

  updateStatus("Recording downloaded");
}

// Add stop button functionality
document.addEventListener("DOMContentLoaded", () => {
  const stopButton = document.getElementById("stopRecording");
  if (stopButton) {
    stopButton.addEventListener("click", () => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
    });
  }
});
