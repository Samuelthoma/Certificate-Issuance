// signature/boxManager.js - Manages signature box creation, storage and positioning
import { makeDraggable } from './dragDrop.js';
import { addResizeHandles } from './resizeHandlers.js';
import { selectBox } from './eventHandlers.js';
import { drawnSignatures, applySignatureToBox } from './signatureHandling.js';

// State variables
let currentPage = 1;
let signatureBoxes = {}; // Store boxes by page number
let overlay;

// Initialize box manager
export function initBoxManager() {
  overlay = document.getElementById("canvasOverlay");
  
  // Initialize signature boxes for current page
  if (!signatureBoxes[currentPage]) {
    signatureBoxes[currentPage] = [];
  }
}

// Create a signature box at specified position with dimensions
export function createSignatureBox(type, left, top, width, height) {
  if (!overlay) {
    overlay = document.getElementById("canvasOverlay");
  }

  const boxId = crypto.randomUUID();
  const box = document.createElement("div");
  
  // Get the current user ID from session storage
  const userId = sessionStorage.getItem("user_id");
  
  // Set basic styles
  box.className = "signature-box absolute border-2 border-gray-400 bg-white bg-opacity-50 cursor-move";
  box.dataset.type = type;
  box.dataset.boxId = boxId;
  box.dataset.userId = userId; // Add user ID to the element's dataset
  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
  box.style.width = `${width}px`;
  box.style.height = `${height}px`;
  
  // Add label based on type
  const label = document.createElement("div");
  label.className = "absolute top-0 left-0 text-xs bg-gray-100 px-1 select-none";
  label.innerHTML = type === "typed" 
    ? '<i class="fas fa-font mr-1"></i>Typed' 
    : '<i class="fas fa-signature mr-1"></i>Drawn';
  box.appendChild(label);
  
  // Add resize handles
  addResizeHandles(box);
  
  // Add delete button
  const deleteBtn = document.createElement("div");
  deleteBtn.className = "absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer";
  deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteSignatureBox(box);
  });
  box.appendChild(deleteBtn);
  
  // Add event listeners for dragging
  makeDraggable(box);
  
  // Add click event for selection
  box.addEventListener("click", (e) => {
    e.stopPropagation();
    selectBox(box);
  });
  
  // Add to DOM
  overlay.appendChild(box);
  
  // Store box in our tracking object
  if (!signatureBoxes[currentPage]) {
    signatureBoxes[currentPage] = [];
  }
  
  // Calculate relative positions for storage (useful when resizing viewport)
  const relX = left / overlay.clientWidth;
  const relY = top / overlay.clientHeight;
  const relWidth = width / overlay.clientWidth;
  const relHeight = height / overlay.clientHeight;
  
  // Store box data with user ID
  signatureBoxes[currentPage].push({
    id: boxId,
    userId: userId, // Store the user ID in the box data
    type,
    relX,
    relY,
    relWidth,
    relHeight,
    element: box
  });
}

// Update stored box position
export function updateBoxPosition(boxElement) {
  if (!overlay) {
    overlay = document.getElementById("canvasOverlay");
  }

  const boxId = boxElement.dataset.boxId;
  const pageBoxes = signatureBoxes[currentPage];
  
  if (!pageBoxes) return;
  
  const boxData = pageBoxes.find(box => box.id === boxId);
  if (!boxData) return;
  
  // Calculate relative positions
  const relX = parseFloat(boxElement.style.left) / overlay.clientWidth;
  const relY = parseFloat(boxElement.style.top) / overlay.clientHeight;
  const relWidth = parseFloat(boxElement.style.width) / overlay.clientWidth;
  const relHeight = parseFloat(boxElement.style.height) / overlay.clientHeight;
  
  // Update stored data
  boxData.relX = relX;
  boxData.relY = relY;
  boxData.relWidth = relWidth;
  boxData.relHeight = relHeight;
}

// Delete a signature box
export function deleteSignatureBox(box) {
  const boxId = box.dataset.boxId;
  
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

// Function to handle page change
export function handlePageChange(newPage) {
  // Save current page before changing
  currentPage = newPage;
  
  // Clear existing boxes from the overlay
  if (!overlay) {
    overlay = document.getElementById("canvasOverlay");
  }
  const existingBoxes = overlay.querySelectorAll(".signature-box");
  existingBoxes.forEach(box => box.remove());
  
  // Load boxes for new page
  loadBoxesForCurrentPage();
}

// Load saved boxes for current page
export function loadBoxesForCurrentPage() {
  if (!overlay) {
    overlay = document.getElementById("canvasOverlay");
  }
  
  // Clear existing boxes
  const existingBoxes = overlay.querySelectorAll(".signature-box");
  existingBoxes.forEach(box => box.remove());
  
  if (!signatureBoxes[currentPage]) {
    signatureBoxes[currentPage] = [];
    return;
  }
  
  // Create DOM elements for all stored boxes
  signatureBoxes[currentPage].forEach(boxData => {
    const { type, relX, relY, relWidth, relHeight, id, userId } = boxData;
    
    // Convert relative positions to absolute
    const left = relX * overlay.clientWidth;
    const top = relY * overlay.clientHeight;
    const width = relWidth * overlay.clientWidth;
    const height = relHeight * overlay.clientHeight;
    
    // Create the element
    const box = document.createElement("div");
    box.className = "signature-box absolute border-2 border-gray-400 bg-white bg-opacity-50 cursor-move";
    box.dataset.type = type;
    box.dataset.boxId = id;
    box.dataset.userId = userId; // Add user ID to the element's dataset
    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;
    
    // Add label
    const label = document.createElement("div");
    label.className = "absolute top-0 left-0 text-xs bg-gray-100 px-1 select-none";
    label.innerHTML = type === "typed" 
      ? '<i class="fas fa-font mr-1"></i>Typed' 
      : '<i class="fas fa-signature mr-1"></i>Drawn';
    box.appendChild(label);
    
    // Add resize handles
    addResizeHandles(box);
    
    // Add delete button
    const deleteBtn = document.createElement("div");
    deleteBtn.className = "absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer";
    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteSignatureBox(box);
    });
    box.appendChild(deleteBtn);
    
    // Add event listeners for dragging
    makeDraggable(box);
    
    // Add click event for selection
    box.addEventListener("click", (e) => {
      e.stopPropagation();
      selectBox(box);
    });
    
    // Add double-click event listener
    box.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      // Handle double-click through event delegation
    });
    
    // Add to DOM
    overlay.appendChild(box);
    
    // Update element reference
    boxData.element = box;
    
    // Restore signature content if it exists
    if (drawnSignatures[id]) {
      if (drawnSignatures[id].typed) {
        applySignatureToBox(id, drawnSignatures[id].typed, "typed");
      } else if (drawnSignatures[id].drawn) {
        applySignatureToBox(id, drawnSignatures[id].drawn, "drawn");
      }
    }
  });
}

// Get signature boxes (for external use)
export function getSignatureBoxes() {
  return signatureBoxes;
}

// Set current page (for external use)
export function setCurrentPage(page) {
  currentPage = page;
}