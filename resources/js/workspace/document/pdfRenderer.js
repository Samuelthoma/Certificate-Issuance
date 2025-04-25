// pdfRenderer.js - Handles PDF rendering and display
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

export async function renderPDF(base64Data) {
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

function getCurrentPage() {
  return currentPage;
}

function setCurrentPage(pageNum) {
  currentPage = pageNum;
}

function getScale() {
  return scale;
}

function setScale(newScale) {
  scale = newScale;
}

function getPdfDoc() {
  return pdfDoc;
}

export {
  renderPDFPage,
  getCurrentPage,
  setCurrentPage,
  getScale,
  setScale,
  getPdfDoc
};