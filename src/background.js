// Orchestrates recording. desktopCapture picker runs here in the worker; the
// actual capture/record happens in a reusable offscreen document.

// Let the popup read session state (defaults to background-only otherwise).
chrome.storage.session.setAccessLevel?.({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" });

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "request_recording") startRecording();
  if (msg.target === "background" && msg.type === "started") chrome.storage.session.set({ recording: true });
  if (msg.target === "background" && msg.type === "recorded") {
    chrome.storage.session.set({ recording: false });
    if (msg.url) save(msg.url); // null = user cancelled the share dialog
  }
});

async function startRecording() {
  // getDisplayMedia (called in the offscreen doc) shows Chrome's own share
  // dialog — that dialog IS the consent, no picker API or gesture needed here.
  await ensureOffscreen();
  chrome.runtime.sendMessage({ target: "offscreen", type: "start" });
}

async function save(dataUrl) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  chrome.downloads.download({ url: dataUrl, filename: `recording-${stamp}.webm`, saveAs: true });
}

async function ensureOffscreen() {
  const path = "src/offscreen.html";
  const existing = await chrome.offscreen.hasDocument?.();
  if (existing) return;
  try {
    await chrome.offscreen.createDocument({
      url: path,
      reasons: ["DISPLAY_MEDIA"],
      justification: "Record the screen with MediaRecorder.",
    });
  } catch (e) {
    // createDocument throws if one already exists (race between clicks) — fine.
    if (!String(e).includes("Only a single offscreen")) throw e;
  }
}
