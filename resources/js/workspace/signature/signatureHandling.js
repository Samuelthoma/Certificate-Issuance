// signature/signatureHandling.js - Signature creation and interaction
import { openTypedModal, openDrawnModal, closeTypedModal, closeDrawnModal } from './modalHandlers.js';

export let drawnSignatures = {}; // Store signatures by box ID
let currentBoxId = null; // Track which box is currently being edited
let hasDrawn = false; // Track if user has drawn anything on canvas

// Initialize signature handling
export function initSignatureHandling() {
  // Set up canvas for drawn signatures
  setupDrawCanvas();
  
  // Set up event listeners for modal actions
  setupModalActions();
  
  // Remove any existing dblclick handler to prevent duplicates
  document.removeEventListener('dblclick', handleBoxDoubleClick);
  
  // Add event listener to detect double clicks on boxes - use document level event delegation
  document.addEventListener('dblclick', handleBoxDoubleClick);
}

// Handle double click on signature boxes
function handleBoxDoubleClick(event) {
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
    hasDrawn = false;
    
    // Reset and potentially load existing signature
    resetDrawCanvas();
    if (drawnSignatures[currentBoxId]?.drawn) {
      loadSignatureToCanvas(drawnSignatures[currentBoxId].drawn);
      // If we're loading a previous signature, consider it as drawn
      if (drawnSignatures[currentBoxId].status === 'active') {
        hasDrawn = true;
      }
    }
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

// Canvas variables
let isDrawing = false;
let drawCanvas, drawCtx;
let lastX, lastY;

// Set up the drawing canvas
function setupDrawCanvas() {
  drawCanvas = document.getElementById('drawCanvas');
  if (!drawCanvas) return;
  
  drawCtx = drawCanvas.getContext('2d');
  
  // Set canvas styling
  drawCtx.lineJoin = 'round';
  drawCtx.lineCap = 'round';
  drawCtx.lineWidth = 2;
  drawCtx.strokeStyle = '#000';
  
  // Mouse event listeners
  drawCanvas.addEventListener('mousedown', startDrawing);
  drawCanvas.addEventListener('mousemove', draw);
  drawCanvas.addEventListener('mouseup', stopDrawing);
  drawCanvas.addEventListener('mouseout', stopDrawing);
  
  // Touch event listeners for mobile
  drawCanvas.addEventListener('touchstart', handleTouchStart);
  drawCanvas.addEventListener('touchmove', handleTouchMove);
  drawCanvas.addEventListener('touchend', stopDrawing);
}

// Mouse drawing handlers
function startDrawing(e) {
  isDrawing = true;
  hasDrawn = true; // User has started drawing
  [lastX, lastY] = [e.offsetX, e.offsetY];
}

function draw(e) {
  if (!isDrawing) return;
  
  drawCtx.beginPath();
  drawCtx.moveTo(lastX, lastY);
  drawCtx.lineTo(e.offsetX, e.offsetY);
  drawCtx.stroke();
  
  [lastX, lastY] = [e.offsetX, e.offsetY];
}

function stopDrawing() {
  isDrawing = false;
}

// Touch drawing handlers
function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = drawCanvas.getBoundingClientRect();
  lastX = touch.clientX - rect.left;
  lastY = touch.clientY - rect.top;
  isDrawing = true;
  hasDrawn = true; // User has started drawing
}

function handleTouchMove(e) {
  e.preventDefault();
  if (!isDrawing) return;
  
  const touch = e.touches[0];
  const rect = drawCanvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  
  drawCtx.beginPath();
  drawCtx.moveTo(lastX, lastY);
  drawCtx.lineTo(x, y);
  drawCtx.stroke();
  
  [lastX, lastY] = [x, y];
}

// Reset the drawing canvas
export function resetDrawCanvas() {
  if (!drawCtx) return;
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  hasDrawn = false; // Reset drawing flag when canvas is cleared
}

// Load a signature image to the canvas
function loadSignatureToCanvas(signatureData) {
  if (!drawCtx) return;
  
  const img = new Image();
  img.onload = () => {
    resetDrawCanvas();
    drawCtx.drawImage(img, 0, 0);
  };
  img.src = signatureData;
}

// Check if canvas is empty
function isCanvasEmpty() {
  if (!drawCtx) return true;
  const pixelBuffer = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height).data;
  return !pixelBuffer.some(channel => channel !== 0);
}

// Save the drawn signature as data URL
function saveDrawnSignature() {
  if (!drawCanvas) return null;
  return drawCanvas.toDataURL('image/png');
}

// Apply the signature to the signature box
export function applySignatureToBox(boxId, signatureData, type) {
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
  
  // Store the signature data
  if (!drawnSignatures[boxId]) {
    drawnSignatures[boxId] = {};
  }
  
  // Determine status based on content
  let status = 'pending';
  
  if (type === 'typed') {
    // For typed signatures, check if there's actual content
    if (signatureData && signatureData.trim() !== '') {
      status = 'active';
    }
    
    drawnSignatures[boxId].typed = signatureData;
    drawnSignatures[boxId].status = status;
    
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
    updateStatusIndicator(targetBox, status);
    
  } else if (type === 'drawn') {
    // For drawn signatures, use our hasDrawn flag
    status = hasDrawn ? 'active' : 'pending';
    
    drawnSignatures[boxId].drawn = signatureData;
    drawnSignatures[boxId].status = status;
    
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
    updateStatusIndicator(targetBox, status);
  }
}

// Update status indicator on box
function updateStatusIndicator(box, status) {
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
}

// Set up modal action buttons
function setupModalActions() {
  // Clear canvas button
  const clearBtn = document.getElementById('clearCanvas');
  if (clearBtn) {
    clearBtn.addEventListener('click', resetDrawCanvas);
  }
  
  // Apply typed signature button
  const applyTypedBtn = document.getElementById('applyTyped');
  if (applyTypedBtn) {
    applyTypedBtn.addEventListener('click', () => {
      const typedInput = document.getElementById('typedInput');
      if (typedInput) {
        // Always provide a string value even if empty
        const inputValue = typedInput.value || '';
        applySignatureToBox(currentBoxId, inputValue, 'typed');
        closeTypedModal();
      }
    });
  }
  
  // Apply drawn signature button
  const applyDrawnBtn = document.getElementById('applyDrawn');
  if (applyDrawnBtn) {
    applyDrawnBtn.addEventListener('click', () => {
      // Ensure we always have a value, even if canvas is empty
      const signatureData = isCanvasEmpty() ? '' : saveDrawnSignature();
      if (signatureData !== null) { // Check for null, but allow empty string
        applySignatureToBox(currentBoxId, signatureData, 'drawn');
        closeDrawnModal();
      }
    });
  }
}

// Export the public API
export default {
  init: initSignatureHandling,
  getSignatures: () => drawnSignatures,
  applySignature: applySignatureToBox,
  resetCanvas: resetDrawCanvas
};