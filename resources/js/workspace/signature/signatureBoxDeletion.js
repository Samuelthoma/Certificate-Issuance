// signature/signatureBoxDeletion.js - Handles deletion of signature boxes
import { drawnSignatures } from './signatureStorage.js';
import { getCurrentPage, getSignatureBoxes } from './signatureBoxManager.js';
import { getPermissions } from '../document/documentPermissions.js';

// Delete a signature box
export function deleteSignatureBox(box) {
  const boxId = box.dataset.boxId;
  const currentPage = getCurrentPage();
  const signatureBoxes = getSignatureBoxes();
  
  const permissions = getPermissions();
  // Check if user is allowed to delete this box (only document owner can delete)
  const isOwner = sessionStorage.getItem("isDocumentOwner") === "true";
  
  // If current user is not the document owner, show an error and prevent deletion
  if (!isOwner) {
    showDeleteErrorMessage("Only the document owner can delete signature fields");
    return;
  }else if (!permissions.canModifySignatureFields) {
    showDeleteErrorMessage("You can't delete signature fields at this stage");
    return;
  }
  
  // Remove from DOM
  box.remove();
  
  // Remove from stored data
  if (signatureBoxes[currentPage]) {
    signatureBoxes[currentPage] = signatureBoxes[currentPage].filter(box => box.id !== boxId);
  }
  
  // Also remove the signature data if it exists
  if (drawnSignatures[boxId]) {
    delete drawnSignatures[boxId];
  }
}

// Show error message when deletion is not allowed
export function showDeleteErrorMessage(message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = "fixed bottom-4 right-4 p-4 rounded shadow-lg z-50 bg-red-500 text-white";
  
  notification.innerHTML = `
    <div class="flex items-center">
      <i class="fas fa-exclamation-circle mr-2"></i>
      <span>${message}</span>
    </div>
  `;
  
  // Add to DOM
  document.body.appendChild(notification);
  
  // Remove after delay
  setTimeout(() => {
    notification.remove();
  }, 3000);
}