import { loadPrivateKey } from './cryptoUtils.js';

let pdfDoc = null;
let currentPage = 1;
let scale = 1.65;

async function renderPDFPage(pageNum) {
  const page = await pdfDoc.getPage(pageNum);
  const canvas = document.getElementById("pdf-canvas");
  const context = canvas.getContext("2d");
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = `${viewport.width / 2}px`;
  canvas.style.height = `${viewport.height / 2}px`;

  const overlay = document.getElementById("canvasOverlay");
  overlay.style.width = canvas.style.width;
  overlay.style.height = canvas.style.height;

  const boxes = overlay.querySelectorAll(".signature-box");
  boxes.forEach(box => {
    const maxLeft = overlay.clientWidth - box.offsetWidth;
    const maxTop = overlay.clientHeight - box.offsetHeight;

    let currentLeft = parseFloat(box.style.left);
    let currentTop = parseFloat(box.style.top);

    currentLeft = Math.max(0, Math.min(currentLeft, maxLeft));
    currentTop = Math.max(0, Math.min(currentTop, maxTop));

    box.style.left = `${currentLeft}px`;
    box.style.top = `${currentTop}px`;
  });

  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  document.getElementById("page-num").textContent = pageNum;
  canvas.classList.remove("hidden");
  document.getElementById("pdf-controls").classList.remove("hidden");
}

async function renderPDF(base64Data) {
  const response = await fetch(`data:application/pdf;base64,${base64Data}`);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  pdfDoc = await loadingTask.promise;

  document.getElementById("page-count").textContent = pdfDoc.numPages;
  currentPage = 1;
  await renderPDFPage(currentPage);
}

async function loadDocument() {
  const documentId = document.body.dataset.documentId;
  const token = sessionStorage.getItem("token");
  const privateKey = sessionStorage.getItem("private_key");

  try {
    const response = await fetch(`/api/documents/${documentId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ private_key: privateKey })
    });

    if (!response.ok) throw new Error("Failed to fetch document");

    const data = await response.json();
    const { file_type, file_data, file_name } = data;

    if (file_type === "application/pdf") {
      await renderPDF(file_data);
      document.getElementById("document-name").textContent = file_name;
      window.originalBase64Data = file_data;
      window.originalFileName = "Signed " + file_name;
    }
  } catch (err) {
    console.error(err);
  }
}

// Start Pagination Feature
document.getElementById("prev-page").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderPDFPage(currentPage);
  }
});

document.getElementById("next-page").addEventListener("click", () => {
  if (currentPage < pdfDoc.numPages) {
    currentPage++;
    renderPDFPage(currentPage);
  }
});
// End Pagination Feature

// Start Scaling Feature
document.getElementById("zoom-in").addEventListener("click", () => {
  scale = Math.min(scale + 0.1, 3.0);
  renderPDFPage(currentPage); // make sure re-renders canvas with new scale
  repositionSignatureBoxes();
});

document.getElementById("zoom-out").addEventListener("click", () => {
  scale = Math.max(scale - 0.1, 0.5);
  renderPDFPage(currentPage); // re-render canvas
  repositionSignatureBoxes();
});
// End Scaling Feature

// DOM Loaded
document.addEventListener("DOMContentLoaded", async function() {
  await loadPrivateKey();
  await loadDocument();
  const canvas = document.getElementById("pdf-canvas");
  if (canvas) {
    canvas.setAttribute("draggable", "false");
    canvas.style.userSelect = "none";
    canvas.style.webkitUserDrag = "none";
    canvas.style.webkitTouchCallout = "none";
  }
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
    const byteCharacters = atob(rawBase64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }

    const blob = new Blob(byteArrays, { type: "application/pdf" });
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
});
// End DOM Loaded


// Disable Context Menu
document.addEventListener("contextmenu", e => e.preventDefault());
