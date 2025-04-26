// initWorkspace.js - Main entry point for the workspace functionality
import { loadPrivateKey } from '../login/cryptoUtils.js';
import { addCollaborator, getCollaborators } from './collaborator/index.js';
import { initializeDocument, exposeCurrentPage } from './document/index.js';
import signatureSystem from './signature/index.js';

// Initialize the entire workspace
async function initWorkspace() {
  try {
    // Initialize cryptography
    await loadPrivateKey();
    
    // Initialize document handling
    const documentLoaded = await initializeDocument();
    if (!documentLoaded) {
      console.error("Failed to load document");
      return;
    }
    
    // Make currentPage accessible globally
    exposeCurrentPage();
    
    // Initialize collaborators
    await addCollaborator();
    await getCollaborators();
    
    // Initialize signature system
    signatureSystem.init();
    
    // Export signature tools to window for use in other scripts
    window.signatureTools = {
      handlePageChange: signatureSystem.handlePageChange,
      loadBoxesForCurrentPage: signatureSystem.loadBoxesForCurrentPage,
      getSignatureBoxes: signatureSystem.getSignatureBoxes
    };
    
    // Initialize signature boxes after a short delay to ensure everything is loaded
    setTimeout(() => {
      if (window.signatureTools && window.signatureTools.loadBoxesForCurrentPage) {
        window.signatureTools.loadBoxesForCurrentPage();
      }
    }, 100);
    
  } catch (err) {
    console.error("Error initializing workspace:", err);
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initWorkspace);

export default initWorkspace;