// document/index.js - Main entry point for document functionality
import { renderPDFPage, getCurrentPage } from './pdfRenderer.js';
import { loadDocument } from './documentLoader.js';
import { initDownloadButton } from './documentDownloader.js';
import { initPaginationControls, initZoomControls } from './uiControls.js';
import { secureCanvas, initContextMenuProtection } from './securityUtils.js';
import { initializePermissions } from './documentPermissions.js'; 
import saveDraftHandler from './saveDraft.js';

async function initializeDocument() {
  try {
    const documentData = await loadDocument();
    if (!documentData) return false;
    
    // Initialize document permissions
    const isOwner = sessionStorage.getItem("isDocumentOwner") === "true";
    const status = sessionStorage.getItem("documentStatus") || "draft";
    initializePermissions(status, isOwner);
    
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