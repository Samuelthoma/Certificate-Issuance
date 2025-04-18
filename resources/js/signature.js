// signature.js - Entry point for signature functionality
import signatureSystem from './signature/index.js';

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
  // Initialize the signature system
  signatureSystem.init();
  
  // Export the API to window for use in other scripts
  window.signatureTools = {
    handlePageChange: signatureSystem.handlePageChange,
    loadBoxesForCurrentPage: signatureSystem.loadBoxesForCurrentPage,
    getSignatureBoxes: signatureSystem.getSignatureBoxes
  };
});