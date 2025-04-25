// signature/signatureHandling.js - Signature creation and interaction

export let drawnSignatures = {}; // Store signatures by box ID
let currentBoxId = null; // Track which box is currently being edited

// Initialize signature handling
export function initSignatureHandling() {
  // Set up canvas for drawn signatures
  setupDrawCanvas();
  
  // Set up event listeners for modal actions
  setupModalActions();
  
  // Add event listener to detect double clicks on boxes
  document.addEventListener('dblclick', handleBoxDoubleClick);
}

// Handle double click on signature boxes
function handleBoxDoubleClick(event) {
  // Find if we clicked on a signature box
  const box = findParentSignatureBox(event.target);
  
  if (!box) return;
  
  // Store the current box ID
  currentBoxId = box.dataset.boxId;
  const boxType = box.dataset.type;
  
  // Open the appropriate modal based on box type
  if (boxType === 'typed') {
    openTypedSignatureModal(currentBoxId);
  } else if (boxType === 'drawn') {
    openDrawnSignatureModal(currentBoxId);
  }
}

// Find the parent signature box of an element
function findParentSignatureBox(element) {
  while (element && !element.classList.contains('signature-box')) {
    element = element.parentElement;
  }
  return element;
}

// Open typed signature modal
function openTypedSignatureModal(boxId) {
  const modal = document.getElementById("typedSignatureModal");
  const typedInput = document.getElementById("typedInput");
  
  // Check if there's an existing signature to load
  if (drawnSignatures[boxId] && drawnSignatures[boxId].typed) {
    typedInput.value = drawnSignatures[boxId].typed;
  } else {
    typedInput.value = '';
  }
  
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    typedInput.focus();
  }
}

// Open drawn signature modal
function openDrawnSignatureModal(boxId) {
  const modal = document.getElementById("drawnSignatureModal");
  
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    
    // Reset the canvas
    resetDrawCanvas();
    
    // Load existing signature if available
    if (drawnSignatures[boxId] && drawnSignatures[boxId].drawn) {
      loadSignatureToCanvas(drawnSignatures[boxId].drawn);
    }
  }
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
function resetDrawCanvas() {
  if (!drawCtx) return;
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
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
  
  if (type === 'typed') {
    drawnSignatures[boxId].typed = signatureData;
    
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
    
  } else if (type === 'drawn') {
    drawnSignatures[boxId].drawn = signatureData;
    
    // Create or update signature image in the box
    let signatureImg = targetBox.querySelector('.signature-img');
    if (!signatureImg) {
      signatureImg = document.createElement('img');
      signatureImg.className = 'signature-img absolute inset-0 w-full h-full object-contain z-10 pointer-events-none';
      targetBox.appendChild(signatureImg);
    }
    
    // Apply the drawn signature
    signatureImg.src = signatureData;
  }
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
      if (typedInput && typedInput.value.trim() !== '') {
        applySignatureToBox(currentBoxId, typedInput.value, 'typed');
        closeTypedModal();
      }
    });
  }
  
  // Apply drawn signature button
  const applyDrawnBtn = document.getElementById('applyDrawn');
  if (applyDrawnBtn) {
    applyDrawnBtn.addEventListener('click', () => {
      const signatureData = saveDrawnSignature();
      if (signatureData) {
        applySignatureToBox(currentBoxId, signatureData, 'drawn');
        closeDrawnModal();
      }
    });
  }
}

// Import functions from modalHandlers.js
import { closeTypedModal, closeDrawnModal } from './modalHandlers.js';

// Export the public API
export default {
  init: initSignatureHandling,
  getSignatures: () => drawnSignatures,
  applySignature: applySignatureToBox
};