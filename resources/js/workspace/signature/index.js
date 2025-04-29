// signature/index.js - Entry point for signature functionality

// Box-related imports
import {
  initBoxManager,
  addSignatureBox as createSignatureBox,
  updateBoxPosition,
  getSignatureBoxes,
  setCurrentPage,
  getCurrentPage } from './signatureBoxManager.js';

import { deleteSignatureBox } from './signatureBoxDeletion.js';
import { updateBoxStatus } from './signatureBoxStatus.js';
import { handlePageChange, loadBoxesForCurrentPage } from './signatureBoxLoader.js';
import { createSignatureBoxForUser } from './signatureBoxFactory.js';
// Other signature components
import { initDragDropHandlers } from './dragDrop.js';
import { initEventHandlers } from './eventHandlers.js';
import { initModalHandlers } from './modalHandlers.js';
import { setupDrawCanvas } from './canvasDrawing.js';
import { drawnSignatures } from './signatureStorage.js';
import { handleBoxDoubleClick, applySignatureToBox } from './signatureBoxInteraction.js';
import { setupModalActions } from './signatureActions.js';

// Initialize signature handling
export function initSignatureHandling() {
  setupDrawCanvas();
  setupModalActions();
  document.removeEventListener('dblclick', handleBoxDoubleClick);
  document.addEventListener('dblclick', handleBoxDoubleClick);
}

// Initialize all signature components
function initSignatureSystem() {
  window.signatureData = {
    drawnSignatures,
    applySignatureToBox
  };

  initBoxManager();
  initDragDropHandlers();
  initEventHandlers();
  initModalHandlers();
  initSignatureHandling();
}

// Export the public API
export {
  // Signature box management
  initBoxManager,
  createSignatureBox,
  updateBoxPosition,
  deleteSignatureBox,
  updateBoxStatus,
  handlePageChange,
  loadBoxesForCurrentPage,
  getSignatureBoxes,
  setCurrentPage,
  getCurrentPage,
  createSignatureBoxForUser,
  drawnSignatures,
  applySignatureToBox,
};

export default {
  init: initSignatureSystem,
  handlePageChange,
  loadBoxesForCurrentPage,
  getSignatureBoxes
};
