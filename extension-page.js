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

            // Check if blob is larger than 15MB
            const MAX_SIZE = 15 * 1024 * 1024; // 15MB in bytes

            if (blob.size > MAX_SIZE) {
              document.getElementById("status").textContent =
                "Compressing video...";
              blob = await compressVideo(blob, MAX_SIZE);
            }

            const blobUrl = URL.createObjectURL(blob);
            downloadRecording(blobUrl, chromePinnedExtenstionTabId);
          };

          // Request data more frequently for better compression
          mediaRecorder.start(1000); // Collect data every second
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

// Function to compress video using lower quality settings
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
    document.getElementById("status").textContent =
      "Compression failed, using original";
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

  document.getElementById("status").textContent = "Recording downloaded";
}
