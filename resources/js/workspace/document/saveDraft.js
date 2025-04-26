// signature/saveDraft.js - Handles saving signature boxes to the database

import { getSignatureBoxes } from '../signature/boxManager.js';
import { drawnSignatures } from '../signature/signatureHandling.js';

/**
 * Initialize save draft button functionality
 * Attaches event listener to the save draft button
 */
export function initSaveDraftButton() {
  const saveBtn = document.getElementById('save-btn');
  
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSaveDraft);
  }
}

/**
 * Handle clicking the save draft button
 * Collects all signature boxes and sends to server
 */
async function handleSaveDraft() {
  try {
    // Show loading state
    showSavingIndicator();
    
    // Collect all signature data
    const signatureData = collectSignatureData();
    
    // Send to server
    const response = await saveSignaturesToServer(signatureData);
    
    // Handle response
    if (response.success) {
      showSuccessMessage(response.message || 'Draft saved successfully!');
      
      // Redirect after a short delay to show success message
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } else {
      showErrorMessage(response.message || 'Failed to save draft. Please try again.');
    }
  } catch (error) {
    console.error('Error saving draft:', error);
    showErrorMessage('An unexpected error occurred. Please try again.');
  }
}

/**
 * Collect all signature data from the document
 * @returns {Object} Formatted signature data
 */
function collectSignatureData() {
  const documentId = document.body.dataset.documentId;
  const userId = sessionStorage.getItem('user_id');
  
  if (!documentId || !userId) {
    throw new Error('Missing required document or user information');
  }
  
  const allBoxes = getSignatureBoxes();
  const signatures = [];
  const existingIds = [];
  
  // Process each page's signature boxes
  Object.entries(allBoxes).forEach(([page, boxes]) => {
    boxes.forEach(box => {
      // Get the signature content
      let content = null;
      if (drawnSignatures[box.id]) {
        content = box.type === 'typed' ? 
          drawnSignatures[box.id].typed : 
          drawnSignatures[box.id].drawn;
      }
      
      // If there's a database ID already assigned (for updates)
      let dbId = box.element?.dataset?.dbId || null;
      if (dbId) {
        existingIds.push(dbId);
      }
      
      signatures.push({
        id: dbId, // null for new signatures, existing ID for updates
        document_id: documentId,
        page: parseInt(page),
        rel_x: box.relX,
        rel_y: box.relY,
        rel_width: box.relWidth,
        rel_height: box.relHeight,
        type: box.type,
        content: content,
        box_id: box.id, // Frontend ID for reference
        user_id: box.userId || userId // Use the box's user ID or current user
      });
    });
  });
  
  return {
    document_id: documentId,
    user_id: userId,
    signatures: signatures,
    existing_ids: existingIds
  };
}

/**
 * Send signatures to server for saving
 * @param {Object} data - Signature data to save
 * @returns {Object} Server response
 */
async function saveSignaturesToServer(data) {
  // Get CSRF token from meta tag
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  
  if (!csrfToken) {
    console.warn('CSRF token not found. Add a meta tag with name="csrf-token"');
  }
  
  const response = await fetch('/api/signatures/save-draft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': csrfToken || '',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Server error occurred');
  }
  
  return await response.json();
}

/**
 * Update UI to show saving in progress
 */
function showSavingIndicator() {
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
  }
}

/**
 * Show success message in UI
 * @param {string} message - Success message to display
 */
function showSuccessMessage(message) {
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Saved';
  }
  
  // Create a notification
  createNotification(message, 'success');
}

/**
 * Show error message in UI
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Draft';
  }
  
  // Create a notification
  createNotification(message, 'error');
}

/**
 * Create a notification element
 * @param {string} message - Message to display
 * @param {string} type - Type of notification ('success' or 'error')
 */
function createNotification(message, type) {
  // Remove any existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => notification.remove());
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification fixed bottom-4 right-4 p-4 rounded shadow-lg z-50 ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  } text-white`;
  
  notification.innerHTML = `
    <div class="flex items-center">
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} mr-2"></i>
      <span>${message}</span>
    </div>
  `;
  
  // Add to DOM
  document.body.appendChild(notification);
  
  // Remove after delay
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Export the initialization function
export default {
  init: initSaveDraftButton
};