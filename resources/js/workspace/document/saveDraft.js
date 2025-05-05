// signature/saveDraft.js - Handles saving signature boxes to the database

import { getSignatureBoxes } from '../signature/signatureBoxManager.js';
import { drawnSignatures } from '../signature/signatureStorage.js';

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
  
  // Flag to check if user is the document owner - updated to use sessionStorage value
  const isDocumentOwner = sessionStorage.getItem("isDocumentOwner") === "true";
  
  // Process each page's signature boxes
  Object.entries(allBoxes).forEach(([page, boxes]) => {
    boxes.forEach(box => {
      // Get the signature content and status
      let content = '';  // Default to empty string to avoid undefined
      let status = 'pending'; // Default status
      
      if (drawnSignatures[box.id]) {
        if (box.type === 'typed') {
          content = drawnSignatures[box.id].typed || '';
        } else {
          content = drawnSignatures[box.id].drawn || '';
        }
        
        // Get the status from the drawnSignatures object
        status = drawnSignatures[box.id].status || 'pending';
      }
      
      // IMPORTANT FIX: Use the dbId property directly from the box object, not from the DOM element
      // This ensures we always have the database ID even if the element reference is lost
      let dbId = box.dbId || null;
      
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
        content: content, // Always include content, even if empty
        status: status, // Include the status
        box_id: box.id, // Frontend ID for reference
        user_id: box.userId || userId // Use the box's user ID or current user as fallback
      });
    });
  });
  
  // If user is document owner, return all existing IDs to allow box deletion
  // Otherwise, only return IDs for boxes the user can modify
  const returnData = {
    document_id: documentId,
    user_id: userId,
    signatures: signatures
  };
  
  // Only include existing_ids if the user is the document owner
  // This controls who can delete signature boxes
  if (isDocumentOwner && existingIds.length > 0) {
    returnData.existing_ids = existingIds;
  }
  
  return returnData;
}

/**
 * Send signatures to server for saving
 * @param {Object} data - Signature data to save
 * @returns {Object} Server response
 */
async function saveSignaturesToServer(data) {
  // Get CSRF token from meta tag
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  const token = sessionStorage.getItem("token");

  if (!csrfToken) {
    console.warn('CSRF token not found. Add a meta tag with name="csrf-token"');
  }
  
  const response = await fetch('/api/signatures/save-draft', {
    method: 'POST',
    headers: {
      "Authorization": `Bearer ${token}`,
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