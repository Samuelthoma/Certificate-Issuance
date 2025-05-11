// document/index.js - Main entry point for document functionality
import { renderPDFPage, getCurrentPage } from './pdfRenderer.js';
import { loadDocument } from './documentLoader.js';
import { initDownloadButton } from './documentDownloader.js';
import { initPaginationControls, initZoomControls } from './uiControls.js';
import { secureCanvas, initContextMenuProtection } from './securityUtils.js';
import { initializePermissions } from './documentPermissions.js'; 
import { initPermissionsUI } from './permissionsUI.js';
import saveDraftHandler from './saveDraft.js';
import { sendDocument } from './sendDocument.js';
import signDocument from './signDocument.js';

async function initializeDocument() {
  try {
    const documentData = await loadDocument();
    if (!documentData) return false;
    
    // Initialize document permissions
    const isOwner = sessionStorage.getItem("isDocumentOwner") === "true";
    const status = sessionStorage.getItem("documentStatus") || "draft";
    initializePermissions(status, isOwner);
    
    // Initialize UI controls
    initPaginationControls();
    initZoomControls();
    initDownloadButton();
    secureCanvas();
    initContextMenuProtection();
    
    // Initialize permission-based UI
    initPermissionsUI();
    signDocument.init();
    
    // Initialize save draft functionality
    saveDraftHandler.init();
    sendDocument();

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