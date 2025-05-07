// signature/signDocument.js - Handles the document signing process
import { getAllSignatures } from '../signature/signatureStorage.js';
import { getSignatureBoxes } from '../signature/signatureBoxManager.js';
/**
 * Initialize sign document button functionality
 * Attaches event listener to the sign document button
 */
export function initSignDocumentButton() {
    const signBtn = document.getElementById('sign-btn');
    
    if (signBtn) {
      signBtn.addEventListener('click', handleSignDocument);
    }
  }
  
  /**
   * Handle clicking the sign document button
   * Initiates the document signing process
   */
  async function handleSignDocument() {
    try {
      // Show loading state
      showSigningIndicator();
      
      // Get document ID and user info
      const documentId = document.body.dataset.documentId;
      const userId = sessionStorage.getItem('user_id');
      const token = sessionStorage.getItem('token');
      const privateKey = sessionStorage.getItem('private_key');
      
      if (!documentId || !userId || !token || !privateKey) {
        throw new Error('Missing required document or user information');
      }
      
      // Step 1: Gather all signature boxes assigned to this user
      const userSignatureBoxes = collectUserSignatureBoxes(userId);
      
      if (userSignatureBoxes.length === 0) {
        showErrorMessage('No signature fields assigned to you found in this document.');
        return;
      }
      
      // Step 2: Verify that all required signatures have content
      if (!validateSignatureContent(userSignatureBoxes)) {
        showErrorMessage('Please complete all your signature fields before signing the document.');
        return;
      }
      
      // Step 3: Initiate signing process with server
      const initiateResponse = await initiateSigningProcess(documentId, userSignatureBoxes, token);
      
      if (!initiateResponse.success) {
        throw new Error(initiateResponse.message || 'Failed to initiate signing process');
      }
      
      const { nonce, document_hash } = initiateResponse;
      
      // Step 4: Create signature using private key
      const signature = await createDigitalSignature(document_hash, privateKey);
      
      // Step 5: Complete signing process - pass the document data along
      // Use the already decrypted document data from when it was initially loaded
      const completeResponse = await completeSigningProcess(
        documentId, 
        nonce, 
        signature, 
        userSignatureBoxes,
        token,
        window.originalBase64Data  // This contains the document data from loadDocument()
      );
      
      // Handle completion response
      if (completeResponse.success) {
        showSuccessMessage(completeResponse.message || 'Document signed successfully!');
        
        // Redirect after a short delay to show success message
        setTimeout(() => {
          window.location.href = completeResponse.redirect_url || '/dashboard';
        }, 2000);
      } else {
        showErrorMessage(completeResponse.message || 'Failed to complete signing. Please try again.');
      }
    } catch (error) {
      console.error('Error signing document:', error);
      showErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      // Reset button state
      resetButtonState();
    }
  }
  
  /**
   * Collect all signature boxes assigned to the specified user
   * @param {string} userId - ID of the current user
   * @returns {Array} Array of signature box data for this user
   */
  function collectUserSignatureBoxes(userId) {
    if (!getSignatureBoxes || !getAllSignatures) {
      console.error('Required signature modules not found');
      return [];
    }
    
    const allBoxes = getSignatureBoxes();
    const allSignatures = getAllSignatures();
    const userBoxes = [];
    
    // Process each page's signature boxes
    Object.entries(allBoxes).forEach(([page, boxes]) => {
      boxes.forEach(box => {
        // Only include boxes assigned to this user
        if (box.userId == userId) {
          // Get signature content if available
          let content = '';
          let signatureType = box.type;
          
          if (allSignatures[box.id]) {
            if (box.type === 'typed') {
              content = allSignatures[box.id].typed || '';
            } else {
              content = allSignatures[box.id].drawn || '';
            }
          }
          
          userBoxes.push({
            box_id: box.id,
            db_id: box.dbId,
            document_id: document.body.dataset.documentId,
            page: parseInt(page),
            rel_x: box.relX,
            rel_y: box.relY,
            rel_width: box.relWidth,
            rel_height: box.relHeight,
            type: signatureType,
            content: content
          });
        }
      });
    });
    
    return userBoxes;
  }
  
  /**
   * Validate that all signature boxes have content
   * @param {Array} signatureBoxes - Array of signature box data
   * @returns {boolean} True if all required boxes have content
   */
  function validateSignatureContent(signatureBoxes) {
    return signatureBoxes.every(box => {
      return box.content && box.content.trim() !== '';
    });
  }
  
  /**
   * Initiate the signing process with the server
   * @param {string} documentId - ID of the document
   * @param {Array} signatureBoxes - Array of signature box data
   * @param {string} token - Authentication token
   * @returns {Object} Server response
   */
  async function initiateSigningProcess(documentId, signatureBoxes, token) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    const response = await fetch('/api/signatures/initiate-signing', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken || '',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        document_id: documentId,
        signature_boxes: signatureBoxes
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Server error occurred');
    }
    
    return await response.json();
  }
  
  /**
   * Create a digital signature using the private key
   * @param {string} documentHash - Hash of the document to sign
   * @param {string} privateKey - Private key in PEM format
   * @returns {string} Base64 encoded signature
   */
  async function createDigitalSignature(documentHash, privateKey) {
    try {
      // Convert private key from PEM to CryptoKey object
      const pemHeader = "-----BEGIN PRIVATE KEY-----";
      const pemFooter = "-----END PRIVATE KEY-----";
      const pemContents = privateKey.substring(
        privateKey.indexOf(pemHeader) + pemHeader.length,
        privateKey.indexOf(pemFooter)
      ).replace(/\s/g, '');
      
      const binaryDer = window.atob(pemContents);
      const byteArray = new Uint8Array(binaryDer.length);
      for (let i = 0; i < binaryDer.length; i++) {
        byteArray[i] = binaryDer.charCodeAt(i);
      }
      
      const importedKey = await window.crypto.subtle.importKey(
        "pkcs8",
        byteArray.buffer,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: { name: "SHA-256" }
        },
        false,
        ["sign"]
      );
      
      // Convert hash to ArrayBuffer
      const encoder = new TextEncoder();
      const hashData = encoder.encode(documentHash);
      
      // Sign the hash
      const signatureBuffer = await window.crypto.subtle.sign(
        { name: "RSASSA-PKCS1-v1_5" },
        importedKey,
        hashData
      );
      
      // Convert signature to Base64
      const signatureArray = new Uint8Array(signatureBuffer);
      let binary = '';
      for (let i = 0; i < signatureArray.length; i++) {
        binary += String.fromCharCode(signatureArray[i]);
      }
      return window.btoa(binary);
    } catch (error) {
      console.error('Error creating digital signature:', error);
      throw new Error('Failed to create digital signature. Please check your certificate.');
    }
  }
  
  /**
   * Complete the signing process with the server
   * @param {string} documentId - ID of the document
   * @param {string} nonce - Nonce from initiate process
   * @param {string} signature - Digital signature
   * @param {Array} signatureBoxes - Array of signature box data
   * @param {string} token - Authentication token
   * @param {string} documentData - Base64 encoded document data
   * @returns {Object} Server response
   */
  async function completeSigningProcess(documentId, nonce, signature, signatureBoxes, token, documentData) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const privateKey = sessionStorage.getItem('private_key');
    
    if (!privateKey) {
      throw new Error('Private key not found in session storage');
    }
    
    const response = await fetch('/api/signatures/complete-signing', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken || '',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        document_id: documentId,
        nonce: nonce,
        signature: signature,
        signature_boxes: signatureBoxes,
        document_data: documentData, // Pass the document data to the server
        private_key: privateKey // Pass the private key to the server
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Server error occurred');
    }
    
    return await response.json();
  }
  
  /**
   * Update UI to show signing in progress
   */
  function showSigningIndicator() {
    const signBtn = document.getElementById('sign-btn');
    if (signBtn) {
      signBtn.disabled = true;
      signBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing...';
    }
  }
  
  /**
   * Reset button state
   */
  function resetButtonState() {
    const signBtn = document.getElementById('sign-btn');
    if (signBtn) {
      signBtn.disabled = false;
      signBtn.innerHTML = '<i class="fas fa-pen-nib mr-2"></i>Sign Document';
    }
  }
  
  /**
   * Show success message in UI
   * @param {string} message - Success message to display
   */
  function showSuccessMessage(message) {
    // Create a notification
    createNotification(message, 'success');
  }
  
  /**
   * Show error message in UI
   * @param {string} message - Error message to display
   */
  function showErrorMessage(message) {
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
    init: initSignDocumentButton
  };