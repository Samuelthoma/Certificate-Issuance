// permissionsUI.js - Handles UI elements based on document permissions
import { hasPermission, getPermissions } from './documentPermissions.js';

/**
 * Updates UI elements based on current permissions
 * Controls visibility and enabled/disabled state of buttons and controls
 */
function updateUIBasedOnPermissions() {
  const status = sessionStorage.getItem("documentStatus") || "draft";
  
  // Get all permissions
  const permissions = getPermissions();
  
  // Update UI based on status
  switch(status) {
    case 'draft':
      updateDraftUI(permissions);
      break;
    case 'pending':
      updatePendingUI(permissions);
      break;
    case 'finalized':
      updateFinalizedUI(permissions);
      break;
    case 'revoked':
      updateRevokedUI(permissions);
      break;
    default:
      console.warn(`Unknown document status for UI update: ${status}`);
  }
}

/**
 * Updates UI elements for documents in draft status
 * @param {Object} permissions - Object containing permission flags
 */
function updateDraftUI(permissions) {
  // Handle Save Draft button
  const saveDraftBtn = document.getElementById('save-btn');
  if (saveDraftBtn) {
    saveDraftBtn.disabled = !permissions.canSaveDraft;
    saveDraftBtn.classList.toggle('opacity-50', !permissions.canSaveDraft);
    saveDraftBtn.classList.toggle('cursor-not-allowed', !permissions.canSaveDraft);
  }

  // Handle Send Document button
  const sendDocumentBtn = document.getElementById('send-document-btn');
  if (sendDocumentBtn) {
    sendDocumentBtn.disabled = !permissions.canSendDocument;
    sendDocumentBtn.classList.toggle('opacity-50', !permissions.canSendDocument);
    sendDocumentBtn.classList.toggle('cursor-not-allowed', !permissions.canSendDocument);
  }

  // Handle Finalize Document button
  const finalizeBtn = document.getElementById('finalize-btn-container');
  if (finalizeBtn) {
    finalizeBtn.style.display = permissions.canFinalizeDocument ? 'block' : 'none';
  }

  // Handle Add Collaborator functionality
  const addCollaboratorBtn = document.getElementById('add-collaborator-btn');
  const collaboratorEmail = document.getElementById('collaborator-email');
  if (addCollaboratorBtn && collaboratorEmail) {
    addCollaboratorBtn.disabled = !permissions.canAddCollaborators;
    collaboratorEmail.disabled = !permissions.canAddCollaborators;

    addCollaboratorBtn.classList.toggle('opacity-50', !permissions.canAddCollaborators);
    addCollaboratorBtn.classList.toggle('cursor-not-allowed', !permissions.canAddCollaborators);
    collaboratorEmail.classList.toggle('opacity-50', !permissions.canAddCollaborators);
    collaboratorEmail.classList.toggle('cursor-not-allowed', !permissions.canAddCollaborators);
  }

  // Handle signature field modification permissions
  const signatureElements = document.querySelectorAll('.signature-toolbar-item');
  signatureElements.forEach(element => {
    element.classList.toggle('pointer-events-none', !permissions.canModifySignatureFields);
    element.classList.toggle('opacity-50', !permissions.canModifySignatureFields);
    element.classList.toggle('cursor-not-allowed', !permissions.canModifySignatureFields);
  });

  // Disable typed input and canvas if signing is not allowed
  const typedInput = document.getElementById('typedInput');
  if (typedInput) {
    typedInput.disabled = !permissions.canSign;
    typedInput.classList.toggle('opacity-50', !permissions.canSign);
    typedInput.classList.toggle('cursor-not-allowed', !permissions.canSign);
  }

  const drawCanvas = document.getElementById('drawCanvas');
  if (drawCanvas) {
    drawCanvas.classList.toggle('pointer-events-none', !permissions.canSign);
    drawCanvas.classList.toggle('opacity-50', !permissions.canSign);
    drawCanvas.classList.toggle('cursor-not-allowed', !permissions.canSign);
  }
}


/**
 * Updates UI elements for documents in pending status
 * @param {Object} permissions - Object containing permission flags
 */
function updatePendingUI(permissions) {
  const saveDraftBtn = document.getElementById('save-btn');
  if (saveDraftBtn) {
    saveDraftBtn.disabled = true;
    saveDraftBtn.classList.add('opacity-50', 'cursor-not-allowed');
  }

  const sendDocumentBtn = document.getElementById('send-document-btn');
  if (sendDocumentBtn) {
    sendDocumentBtn.disabled = true;
    sendDocumentBtn.classList.add('opacity-50', 'cursor-not-allowed');
  }

  const finalizeBtn = document.getElementById('finalize-btn-container');
  if (finalizeBtn) {
    finalizeBtn.style.display = permissions.canFinalizeDocument ? 'block' : 'none';
  }

  const addCollaboratorBtn = document.getElementById('add-collaborator-btn');
  const collaboratorEmail = document.getElementById('collaborator-email');
  if (addCollaboratorBtn && collaboratorEmail) {
    addCollaboratorBtn.disabled = !permissions.canAddCollaborators;
    collaboratorEmail.disabled = !permissions.canAddCollaborators;

    addCollaboratorBtn.classList.toggle('opacity-50', !permissions.canAddCollaborators);
    addCollaboratorBtn.classList.toggle('cursor-not-allowed', !permissions.canAddCollaborators);
    collaboratorEmail.classList.toggle('opacity-50', !permissions.canAddCollaborators);
    collaboratorEmail.classList.toggle('cursor-not-allowed', !permissions.canAddCollaborators);
  }

  // Handle signature field modification permissions
  const signatureElements = document.querySelectorAll('.signature-toolbar-item');
  signatureElements.forEach(element => {
    element.classList.toggle('pointer-events-none', !permissions.canModifySignatureFields);
    element.classList.toggle('opacity-50', !permissions.canModifySignatureFields);
    element.classList.toggle('cursor-not-allowed', !permissions.canModifySignatureFields);
  });

  // Disable typed input and canvas if signing is not allowed
  const typedInput = document.getElementById('typedInput');
  if (typedInput) {
    typedInput.disabled = !permissions.canSign;
    typedInput.classList.toggle('opacity-50', !permissions.canSign);
    typedInput.classList.toggle('cursor-not-allowed', !permissions.canSign);
  }
}

/**
 * Updates UI elements for documents in finalized status
 * @param {Object} permissions - Object containing permission flags
 */
function updateFinalizedUI(permissions) {
  // Placeholder for finalized status UI updates
  // Will be implemented in future
  console.log("Finalized UI updates not implemented yet");
}

/**
 * Updates UI elements for documents in revoked status
 * @param {Object} permissions - Object containing permission flags
 */
function updateRevokedUI(permissions) {
  // Placeholder for revoked status UI updates
  // Will be implemented in future
  console.log("Revoked UI updates not implemented yet");
}

/**
 * Initialize permission-based UI controls
 */
function initPermissionsUI() {
  // Apply permissions immediately on load
  updateUIBasedOnPermissions();
  
  // Set up event listener for permission changes
  window.addEventListener('permissionsUpdated', () => {
    updateUIBasedOnPermissions();
  });
}

export {
  initPermissionsUI,
  updateUIBasedOnPermissions
};