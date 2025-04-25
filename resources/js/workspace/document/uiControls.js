// uiControls.js - Handles UI controls like pagination and zoom
import { renderPDFPage, getCurrentPage, setCurrentPage, getScale, setScale, getPdfDoc } from './pdfRenderer.js';

// Initialize pagination control events
export function initPaginationControls() {
  const prevPageBtn = document.getElementById("prev-page");
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      const currentPage = getCurrentPage();
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
        renderPDFPage(getCurrentPage());
      }
    });
  }

  const nextPageBtn = document.getElementById("next-page");
  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      const pdfDoc = getPdfDoc();
      const currentPage = getCurrentPage();
      if (pdfDoc && currentPage < pdfDoc.numPages) {
        setCurrentPage(currentPage + 1);
        renderPDFPage(getCurrentPage());
      }
    });
  }
}

// Initialize zoom control events
function initZoomControls() {
  const zoomInBtn = document.getElementById("zoom-in");
  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", () => {
      const newScale = Math.min(getScale() + 0.5, 3.0);
      setScale(newScale);
      renderPDFPage(getCurrentPage());
      repositionSignatureBoxes();
    });
  }

  const zoomOutBtn = document.getElementById("zoom-out");
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", () => {
      const newScale = Math.max(getScale() - 0.5, 0.5);
      setScale(newScale);
      renderPDFPage(getCurrentPage());
      repositionSignatureBoxes();
    });
  }
}

// Scaling Feature with signature box update
function repositionSignatureBoxes() {
  // Update signature boxes to match new scale
  if (window.signatureTools && window.signatureTools.loadBoxesForCurrentPage) {
    window.signatureTools.loadBoxesForCurrentPage();
  }
}

export {
  initZoomControls,
  repositionSignatureBoxes
};