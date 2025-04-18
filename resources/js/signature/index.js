import { initBoxManager, handlePageChange, loadBoxesForCurrentPage, getSignatureBoxes } from './boxManager.js';
import { initDragDropHandlers } from './dragDrop.js';
import { initEventHandlers } from './eventHandlers.js';
import { initModalHandlers } from './modalHandlers.js';
import { initSignatureHandling, drawnSignatures, applySignatureToBox } from './signatureHandling.js';

// Initialize all signature components
function initSignatureSystem() {
  // Share the signature data with the box manager
  window.signatureData = {
    drawnSignatures,
    applySignatureToBox
  };
  
  // Initialize box manager
  initBoxManager();
  
  // Initialize drag and drop handlers
  initDragDropHandlers();
  
  // Initialize event handlers (click, select, etc.)
  initEventHandlers();
  
  // Initialize modal handlers
  initModalHandlers();
  
  // Initialize signature handling
  initSignatureHandling();
}

// Export the public API
export default {
  init: initSignatureSystem,
  handlePageChange,
  loadBoxesForCurrentPage,
  getSignatureBoxes: () => getSignatureBoxes()
};