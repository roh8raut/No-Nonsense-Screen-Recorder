// Runs in a hidden offscreen document — the only place an MV3 extension can
// hold a MediaStream + MediaRecorder. Created once, reused for every recording.

let mediaRecorder = null;
let stream = null;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== "offscreen") return;
  if (msg.type === "start") start();
  if (msg.type === "stop") mediaRecorder?.state === "recording" && mediaRecorder.stop();
});

async function start() {
  try {
    // Video only. audio:false + systemAudio:"exclude" tells Chrome we don't want
    // audio, so it won't share/offer the tab-audio toggle by default. The dialog
    // is Chrome's own UI, so this is a hint — we can't remove the toggle outright.
    stream = await navigator.mediaDevices.getDisplayMedia({
      // displaySurface:"window" asks Chrome to pre-select the Window tab in the
      // dialog. It's a hint — Chrome owns the UI and may ignore it.
      video: { displaySurface: "window" },
      audio: false,
      systemAudio: "exclude",
    });
  } catch (e) {
    // User dismissed the share dialog, or it failed — reset state, nothing to record.
    chrome.runtime.sendMessage({ target: "background", type: "recorded", url: null });
    return;
  }

  // Pick the smallest-for-quality codec the browser actually supports, best first.
  const mime = [
    "video/webm;codecs=av01",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ].find((m) => MediaRecorder.isTypeSupported(m));

  const chunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
  mediaRecorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  mediaRecorder.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop()); // release the capture session now
    stream = null;
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = await blobToDataUrl(blob); // self-contained; downloads API can't reach our object URLs
    chrome.runtime.sendMessage({ target: "background", type: "recorded", url });
  };

  // A capture ends when the user clicks Chrome's native "Stop sharing" bar.
  stream.getVideoTracks()[0].addEventListener("ended", () => mediaRecorder.stop());

  mediaRecorder.start();
  chrome.runtime.sendMessage({ target: "background", type: "started" });
}

// A blob: object URL is scoped to this document and the downloads API (in the
// worker) can't resolve it. A data: URL is self-contained, so it can.
// ponytail: fine up to a few hundred MB; for huge recordings switch to
// chrome.downloads via a blob URL created in the worker, or File System Access.
function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}
