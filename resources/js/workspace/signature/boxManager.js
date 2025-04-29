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
export function createSignatureBox(type, left, top, width, height, targetUserId = null) {
  if (!overlay) {
    overlay = document.getElementById("canvasOverlay");
  }

  const boxId = crypto.randomUUID();
  const box = document.createElement("div");
  
  // Get the current user ID from session storage
  const currentUserId = sessionStorage.getItem("user_id");
  // Use the provided targetUserId or default to current user
  const userId = targetUserId || currentUserId;
  
  // Set basic styles
  box.className = "signature-box absolute border-2 border-gray-400 bg-white bg-opacity-50 cursor-move";
  box.dataset.type = type;
  box.dataset.boxId = boxId;
  box.dataset.userId = userId; // Set the user ID for whom this signature is intended
  box.dataset.status = "pending"; // Default status is pending
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
  
  // Add status indicator
  const statusIndicator = document.createElement("div");
  statusIndicator.className = "status-indicator absolute bottom-0 right-0 text-xs px-1 rounded-tl-md bg-yellow-500 text-black";
  statusIndicator.textContent = "Pending";
  box.appendChild(statusIndicator);
  
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
  
  // Store box data with user ID and status
  signatureBoxes[currentPage].push({
    id: boxId,
    userId: userId, // Store the user ID in the box data
    type,
    relX,
    relY,
    relWidth,
    relHeight,
    status: "pending", // Default status is pending
    element: box
  });
  
  // Initialize in drawnSignatures to track status
  if (!drawnSignatures[boxId]) {
    drawnSignatures[boxId] = {
      status: "pending"
    };
  }
  
  return boxId;
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
  
  // Make sure status is preserved
  boxData.status = boxElement.dataset.status || "pending";
}

// Delete a signature box
export function deleteSignatureBox(box) {
  const boxId = box.dataset.boxId;
  
  // Check if user is allowed to delete this box (only document owner can delete)
  const isOwner = sessionStorage.getItem("isDocumentOwner") === "true";
  
  // If current user is not the document owner, show an error and prevent deletion
  if (!isOwner) {
    showDeleteErrorMessage("Only the document owner can delete signature fields");
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
function showDeleteErrorMessage(message) {
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
  
  // Import drawnSignatures to ensure we have the latest
  import('./signatureHandling.js').then(module => {
    const drawnSignatures = module.drawnSignatures;
    
    // Clear existing boxes
    const existingBoxes = overlay.querySelectorAll(".signature-box");
    existingBoxes.forEach(box => box.remove());
    
    if (!signatureBoxes[currentPage]) {
      signatureBoxes[currentPage] = [];
      return;
    }
    
    // Create DOM elements for all stored boxes
    signatureBoxes[currentPage].forEach(boxData => {
      const { type, relX, relY, relWidth, relHeight, id, userId, status } = boxData;
      
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
      box.dataset.status = status || "pending"; // Add status to the element's dataset with default
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
      
      // Add status indicator
      const statusClass = status === "active" ? "bg-green-500 text-white" : "bg-yellow-500 text-black";
      const statusText = status === "active" ? "Signed" : "Pending";
      
      const statusIndicator = document.createElement("div");
      statusIndicator.className = `status-indicator absolute bottom-0 right-0 text-xs px-1 rounded-tl-md ${statusClass}`;
      statusIndicator.textContent = statusText;
      box.appendChild(statusIndicator);
      
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
      
      // Update element reference
      boxData.element = box;

      // Restore dbId to DOM element
      if (boxData.dbId) {
        box.dbId = boxData.dbId;
      }
      
      // Initialize drawnSignatures entry if not exists
      if (!drawnSignatures[id]) {
        drawnSignatures[id] = {
          status: status || "pending"
        };
      }
      
      // Restore signature content if it exists
      if (drawnSignatures[id]) {
        if (drawnSignatures[id].typed) {
          try {
            module.applySignatureToBox(id, drawnSignatures[id].typed, "typed");
          } catch (error) {
            console.warn(`Error applying typed signature to box ${id}:`, error);
          }
        } else if (drawnSignatures[id].drawn) {
          try {
            module.applySignatureToBox(id, drawnSignatures[id].drawn, "drawn");
          } catch (error) {
            console.warn(`Error applying drawn signature to box ${id}:`, error);
          }
        }
      }
    });
  }).catch(error => {
    console.error("Error loading signature handling module:", error);
  });
}

// Update signature box status
export function updateBoxStatus(boxId, status) {
  // Find the box in the DOM
  const boxElement = document.querySelector(`.signature-box[data-box-id="${boxId}"]`);
  
  if (boxElement) {
    // Update the dataset
    boxElement.dataset.status = status;
    
    // Update the status indicator
    let statusIndicator = boxElement.querySelector('.status-indicator');
    if (statusIndicator) {
      // Remove old classes and add new ones
      statusIndicator.classList.remove('bg-green-500', 'bg-yellow-500', 'text-white', 'text-black');
      
      if (status === 'active') {
        statusIndicator.classList.add('bg-green-500', 'text-white');
        statusIndicator.textContent = 'Signed';
      } else {
        statusIndicator.classList.add('bg-yellow-500', 'text-black');
        statusIndicator.textContent = 'Pending';
      }
    }
  }
  
  // Update in our data structures
  const pageBoxes = signatureBoxes[currentPage];
  
  if (pageBoxes) {
    const boxData = pageBoxes.find(box => box.id === boxId);
    if (boxData) {
      boxData.status = status;
    }
  }
  
  // Update in drawnSignatures
  if (drawnSignatures[boxId]) {
    drawnSignatures[boxId].status = status;
  } else {
    drawnSignatures[boxId] = { status };
  }
}

// Get signature boxes (for external use)
export function getSignatureBoxes() {
  return signatureBoxes;
}

// Set current page (for external use)
export function setCurrentPage(page) {
  currentPage = page;
}

// Create a signature box for another user
export function createSignatureBoxForUser(type, left, top, width, height, userId) {
  return createSignatureBox(type, left, top, width, height, userId);
}