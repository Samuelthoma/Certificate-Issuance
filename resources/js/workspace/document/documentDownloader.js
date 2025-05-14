// documentDownloader.js - Handles document download functionality

function initDownloadButton() {
  const downloadBtn = document.getElementById("download-btn");
  if (!downloadBtn) return;

  downloadBtn.addEventListener("click", function () {
    const base64 = window.originalBase64Data;
    const fileName = window.originalFileName || "document.pdf";

    if (!base64) {
      alert("No base64 data found for download.");
      return;
    }

    const rawBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
    const binary = atob(rawBase64);
    const len = binary.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 100);
  });
}

export {
  initDownloadButton
};
