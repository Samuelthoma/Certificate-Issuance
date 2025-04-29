// signature/signatureBoxInteraction.js - Signature box interaction handling

import { openTypedModal, openDrawnModal, closeTypedModal, closeDrawnModal } from './modalHandlers.js';
import { loadSignatureToCanvas, resetDrawCanvas, getHasDrawn, setHasDrawn } from './canvasDrawing.js';
import { drawnSignatures, storeSignature } from './signatureStorage.js';

// Track which box is currently being edited
let currentBoxId = null;

// Handle double click on signature boxes
export async function handleBoxDoubleClick(event) {
  // Find if we clicked on a signature box or any of its children
  const box = findParentSignatureBox(event.target);
  
  if (!box) return;
  
  // Check if the box is enabled for editing
  const currentUserId = sessionStorage.getItem("user_id");
  const boxUserId = box.dataset.userId;
  
  // Check for permissions - allow only if box belongs to current user or for testing purposes
  if (boxUserId && boxUserId !== currentUserId) {
    console.log("Cannot edit signature for another user");
    return;
  }
  
  // Get the current box ID and type from dataset attributes
  currentBoxId = box.dataset.boxId;
  const boxType = box.dataset.type;
  
  console.log("Double-clicked on box:", currentBoxId, "Type:", boxType);
  
  // Open the appropriate modal based on box type
  if (boxType === 'typed') {
    // Check if there's an existing signature to load
    const existingValue = drawnSignatures[currentBoxId]?.typed || '';
    openTypedModal(currentBoxId, existingValue);
  } else if (boxType === 'drawn') {
    openDrawnModal();
    
    // Reset drawing flag when opening modal
    setHasDrawn(false);
    
    // Reset and potentially load existing signature
    resetDrawCanvas();
    if (drawnSignatures[currentBoxId]?.drawn) {
      loadSignatureToCanvas(drawnSignatures[currentBoxId].drawn);
      // If we're loading a previous signature, consider it as drawn
      if (drawnSignatures[currentBoxId].status === 'active') {
        setHasDrawn(true);
      }
    }
  }

  // Fetch and display collaborators
  await fetchCollaborators();
}

// Fetch collaborators for the document
async function fetchCollaborators() {
  const documentId = document.body.dataset.documentId;
  const token = sessionStorage.getItem("token");

  try {
    const response = await fetch(`/api/documents/getCollaborators/${documentId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    });
    const result = await response.json();
  
    const collaboratorLists = document.querySelectorAll('.collaboratorList');
    const assignToTexts = document.querySelectorAll('.assign-to');
    const currentUserId = sessionStorage.getItem("user_id");

    if (result.collaborators.length === 0) {
        collaboratorLists.forEach(select => {
            select.classList.add('hidden');
        });
        assignToTexts.forEach(text => {
            text.textContent = "No collaborators available";
        });
    } else {
        collaboratorLists.forEach(select => {
            // Clear previous options
            select.innerHTML = '';

            const defaultOption = document.createElement('option');
            defaultOption.value = currentUserId;
            defaultOption.textContent = 'Owner';
            select.appendChild(defaultOption);

            // Add collaborators
            result.collaborators.forEach(user => {
                const option = document.createElement('option');
                option.value = user.user_id;
                option.textContent = user.email;
                select.appendChild(option);
            });
        });

        assignToTexts.forEach(text => {
            text.textContent = "Assign to :";
        });
    }

    if (!response.ok) throw new Error("Failed");
  } catch (error) {
    console.error("Error fetching collaborators:", error);
  }
}

// Find the parent signature box of an element
function findParentSignatureBox(element) {
  // If the element is null or the body element, we've gone too far up
  if (!element || element === document.body) return null;
  
  // Check if this element is a signature box
  if (element.classList && element.classList.contains('signature-box')) {
    return element;
  }
  
  // Check if it's any of the special elements we want to ignore
  // like resize handles or control buttons that might interfere
  if (element.classList && 
      (element.classList.contains('resize-handle') || 
       element.classList.contains('status-indicator'))) {
    // Get the parent of these elements directly
    return element.closest('.signature-box');
  }
  
  // Otherwise recursively check the parent
  return findParentSignatureBox(element.parentElement);
}

// Apply the signature to the signature box
export function applySignatureToBox(boxId, signatureData, type, userId) {
  // Find the box element
  const boxes = document.querySelectorAll('.signature-box');
  let targetBox = null;
  
  for (const box of boxes) {
    if (box.dataset.boxId === boxId) {
      targetBox = box;
      break;
    }
  }
  
  if (!targetBox) return;
  
  targetBox.dataset.userId = userId;

  // Determine status based on content
  let status = 'pending';
  
  if (type === 'typed') {
    // For typed signatures, check if there's actual content
    if (signatureData && signatureData.trim() !== '') {
      status = 'active';
    }
    
    // Store the signature data
    storeSignature(boxId, 'typed', signatureData, status, userId);
    
    // Create or update signature content in the box
    let signatureContent = targetBox.querySelector('.signature-content');
    if (!signatureContent) {
      signatureContent = document.createElement('div');
      signatureContent.className = 'signature-content absolute inset-0 flex items-center justify-center text-gray-800 overflow-hidden z-10 pointer-events-none';
      targetBox.appendChild(signatureContent);
    }
    
    // Apply the typed signature
    signatureContent.textContent = signatureData;
    signatureContent.style.fontFamily = 'cursive, sans-serif';
    
    // Add a visual indicator of status
    updateStatusIndicator(targetBox, status, userId);
    
  } else if (type === 'drawn') {
    // For drawn signatures, use our hasDrawn flag
    status = getHasDrawn() ? 'active' : 'pending';
    
    // Store the signature data
    storeSignature(boxId, 'drawn', signatureData, status, userId);
    
    // Create or update signature image in the box
    let signatureImg = targetBox.querySelector('.signature-img');
    if (!signatureImg) {
      signatureImg = document.createElement('img');
      signatureImg.className = 'signature-img absolute inset-0 w-full h-full object-contain z-10 pointer-events-none';
      targetBox.appendChild(signatureImg);
    }
    
    // Apply the drawn signature
    signatureImg.src = signatureData;
    
    // Add a visual indicator of status
    updateStatusIndicator(targetBox, status, userId);
  }
}

// Update status indicator on box
function updateStatusIndicator(box, status, userId) {
  // Remove any existing status indicator
  const existingIndicator = box.querySelector('.status-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // Create status indicator
  const indicator = document.createElement('div');
  indicator.className = `status-indicator absolute bottom-0 right-0 text-xs px-1 rounded-tl-md ${
    status === 'active' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'
  }`;
  indicator.textContent = status === 'active' ? 'Signed' : 'Pending';
  box.appendChild(indicator);
  
  // Also update the data attribute for status
  box.dataset.status = status;
  box.dataset.userId = userId;
}

// Get the current box ID
export function getCurrentBoxId() {
  return currentBoxId;
}

// Set the current box ID
export function setCurrentBoxId(boxId) {
  currentBoxId = boxId;
}