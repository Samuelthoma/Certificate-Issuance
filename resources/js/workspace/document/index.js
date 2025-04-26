// document/index.js - Main entry point for document functionality
import { renderPDFPage, getCurrentPage } from './pdfRenderer.js';
import { loadDocument, initDownloadButton } from './documentLoader.js';
import { initPaginationControls, initZoomControls } from './uiControls.js';
import { secureCanvas, initContextMenuProtection } from './securityUtils.js';
import saveDraftHandler from './saveDraft.js';

async function initializeDocument() {
  try {
    const documentData = await loadDocument();
    if (!documentData) return false;
    
    initPaginationControls();
    initZoomControls();
    initDownloadButton();
    secureCanvas();
    initContextMenuProtection();
    
    // Initialize save draft functionality
    saveDraftHandler.init();
    
    return true;
  } catch (err) {
    console.error("Error initializing document:", err);
    return false;
  }
}

// Make the current page accessible to other modules
function exposeCurrentPage() {
  window.getCurrentPage = getCurrentPage;
}

// Re-render current page
function refreshCurrentView() {
  renderPDFPage(getCurrentPage());
}

export {
  initializeDocument,
  exposeCurrentPage,
  refreshCurrentView
};