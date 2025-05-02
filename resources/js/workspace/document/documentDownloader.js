// documentDownloader.js - Handles document download functionality
import { getSignatureBoxes } from '../signature/signatureBoxManager.js';
import { drawnSignatures } from '../signature/signatureStorage.js';
import { PDFDocument, rgb } from 'pdf-lib';

// Download functionality
function initDownloadButton() {
  const downloadBtn = document.getElementById("download-btn");
  if (!downloadBtn) return;

  downloadBtn.addEventListener("click", async function () {
    const base64 = window.originalBase64Data;
    const fileName = window.originalFileName || "document.pdf";

    if (!base64) {
      alert("No base64 data found for download.");
      return;
    }

    const rawBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
    const pdfBytes = Uint8Array.from(atob(rawBase64), c => c.charCodeAt(0));
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    const boxesByPage = getSignatureBoxes();
    const allSignatures = drawnSignatures;

    for (const [pageNumStr, boxes] of Object.entries(boxesByPage)) {
      const pageIndex = parseInt(pageNumStr) - 1;
      const page = pages[pageIndex];
      const { width, height } = page.getSize();

      for (const box of boxes) {
        const content = allSignatures[box.id];
        if (!content || box.status !== "active") continue;

        const x = box.relX * width;
        const y = (1 - box.relY - box.relHeight) * height; // Flip Y-axis for PDF-lib
        const w = box.relWidth * width;
        const h = box.relHeight * height;

        if (content.typed) {
          page.drawText(content.typed, {
            x,
            y: y + h / 2 - 6,
            size: 12,
            color: rgb(0, 0, 0),
            maxWidth: w
          });
        } else if (content.drawn) {
          const imageBase64 = content.drawn.split(",")[1];
          const imageUint8 = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
          const pngImage = await pdfDoc.embedPng(imageUint8);

          page.drawImage(pngImage, {
            x,
            y,
            width: w,
            height: h
          });
        }
      }
    }

    const modifiedPdfBytes = await pdfDoc.save();
    const blob = new Blob([modifiedPdfBytes], { type: "application/pdf" });
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