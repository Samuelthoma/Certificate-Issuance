import { loadPrivateKey } from './cryptoUtils.js';

let pdfDoc = null;
let currentPage = 1;
let scale = 1.65;

async function renderPDFPage(pageNum) {
  if (!pdfDoc) return;
  
  try {
    const page = await pdfDoc.getPage(pageNum);
    const canvas = document.getElementById("pdf-canvas");
    if (!canvas) return;
    
    const context = canvas.getContext("2d");
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / 2}px`;
    canvas.style.height = `${viewport.height / 2}px`;

    // Set overlay dimensions to match canvas
    const overlay = document.getElementById("canvasOverlay");
    if (overlay) {
      overlay.style.width = canvas.style.width;
      overlay.style.height = canvas.style.height;
    }

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    const pageNumElement = document.getElementById("page-num");
    if (pageNumElement) {
      pageNumElement.textContent = pageNum;
    }
    
    canvas.classList.remove("hidden");
    
    const controlsElement = document.getElementById("pdf-controls");
    if (controlsElement) {
      controlsElement.classList.remove("hidden");
    }
    
    // Update current page in signature system
    if (window.signatureTools) {
      window.signatureTools.handlePageChange(pageNum);
    }
  } catch (err) {
    console.error("Error rendering PDF page:", err);
  }
}

async function renderPDF(base64Data) {
  if (!base64Data) {
    console.error("No PDF data provided");
    return;
  }
  
  try {
    const response = await fetch(`data:application/pdf;base64,${base64Data}`);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    
    // Check if pdfjsLib is available
    if (typeof pdfjsLib === 'undefined') {
      console.error("PDF.js library not loaded");
      return;
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdfDoc = await loadingTask.promise;

    const pageCountElement = document.getElementById("page-count");
    if (pageCountElement) {
      pageCountElement.textContent = pdfDoc.numPages;
    }
    
    currentPage = 1;
    await renderPDFPage(currentPage);
  } catch (err) {
    console.error("Error rendering PDF:", err);
  }
}

async function loadDocument() {
  const documentId = document.body.dataset.documentId;
  if (!documentId) {
    console.error("No document ID found");
    return;
  }
  
  const token = sessionStorage.getItem("token");
  const privateKey = sessionStorage.getItem("private_key");

  if (!token || !privateKey) {
    console.error("Missing authentication information");
    return;
  }

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

    if (file_type === "application/pdf" && file_data) {
      await renderPDF(file_data);
      
      const documentNameElement = document.getElementById("document-name");
      if (documentNameElement) {
        documentNameElement.textContent = file_name;
      }
      
      window.originalBase64Data = file_data;
      window.originalFileName = "Signed " + file_name;
    } else {
      console.error("Unsupported file type or missing data");
    }
  } catch (err) {
    console.error("Error loading document:", err);
  }
}

// Initialize pagination control events
function initPaginationControls() {
  const prevPageBtn = document.getElementById("prev-page");
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderPDFPage(currentPage);
      }
    });
  }

  const nextPageBtn = document.getElementById("next-page");
  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      if (pdfDoc && currentPage < pdfDoc.numPages) {
        currentPage++;
        renderPDFPage(currentPage);
      }
    });
  }
}

// Initialize zoom control events
function initZoomControls() {
  const zoomInBtn = document.getElementById("zoom-in");
  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", () => {
      scale = Math.min(scale + 0.5, 3.0);
      renderPDFPage(currentPage);
      repositionSignatureBoxes();
    });
  }

  const zoomOutBtn = document.getElementById("zoom-out");
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", () => {
      scale = Math.max(scale - 0.5, 0.5);
      renderPDFPage(currentPage);
      repositionSignatureBoxes();
    });
  }
}

// Scaling Feature with signature box update
function repositionSignatureBoxes() {
  // Update signature boxes to match new scale
  if (window.signatureTools) {
    window.signatureTools.loadBoxesForCurrentPage();
  }
}

// Initialize download button
function initDownloadButton() {
  const downloadBtn = document.getElementById("download-btn");
  if (downloadBtn) {
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
  }
}

// Canvas security settings
function secureCanvas() {
  const canvas = document.getElementById("pdf-canvas");
  if (canvas) {
    canvas.setAttribute("draggable", "false");
    canvas.style.userSelect = "none";
    canvas.style.webkitUserDrag = "none";
    canvas.style.webkitTouchCallout = "none";
  }
  
  // Enable the overlay for interactions
  const overlay = document.getElementById("canvasOverlay");
  if (overlay) {
    overlay.style.pointerEvents = "auto";
  }
}

// DOM Loaded
document.addEventListener("DOMContentLoaded", async function() {
  try {
    // Initialize all components in a safe order
    await loadPrivateKey();
    await loadDocument();
    
    initPaginationControls();
    initZoomControls();
    initDownloadButton();
    secureCanvas();
    
    // Initialize signature system if available but with a small delay
    // to ensure everything is properly rendered
    setTimeout(() => {
      if (window.signatureTools && window.signatureTools.loadBoxesForCurrentPage) {
        window.signatureTools.loadBoxesForCurrentPage();
      }
    }, 100);
  } catch (err) {
    console.error("Error initializing workspace:", err);
  }
});

// Disable Context Menu
document.addEventListener("contextmenu", e => e.preventDefault());

// Make currentPage accessible to other modules
window.getCurrentPage = () => currentPage;