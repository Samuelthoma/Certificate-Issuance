// signature/signatureBoxFactory.js - Creates and configures signature boxes
import { makeDraggable } from './dragDrop.js';
import { addResizeHandles } from './resizeHandlers.js';
import { selectBox } from './eventHandlers.js';
import { drawnSignatures } from './signatureStorage.js';
import { deleteSignatureBox } from './signatureBoxDeletion.js';
import { getPermissions } from '../document/documentPermissions.js';


// Create a signature box at specified position with dimensions
export function createSignatureBox(type, left, top, width, height, targetUserId = null, overlay) {
  const boxId = crypto.randomUUID();
  const box = document.createElement("div");
  
  // Get the current user ID from session storage
  const currentUserId = sessionStorage.getItem("user_id");
  const permissions = getPermissions();
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
  if(permissions.canModifySignatureFields){
    addResizeHandles(box);
  }
  
  // Add delete button
  if (permissions.canModifySignatureFields) {
    const deleteBtn = document.createElement("div");
    deleteBtn.className = "absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer deleteBtn";
    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteSignatureBox(box);
    });
    box.appendChild(deleteBtn);
  }

  // Add event listeners for dragging
  if (permissions.canModifySignatureFields) {
    makeDraggable(box);
  }
  
  
  // Add click event for selection
  box.addEventListener("click", (e) => {
    e.stopPropagation();
    selectBox(box);
  });
  
  // Add to DOM
  overlay.appendChild(box);
  
  // Initialize in drawnSignatures to track status
  if (!drawnSignatures[boxId]) {
    drawnSignatures[boxId] = {
      status: "pending"
    };
  }
  
  return boxId;
}

// Create a signature box for another user
export function createSignatureBoxForUser(type, left, top, width, height, userId, overlay) {
  return createSignatureBox(type, left, top, width, height, userId, overlay);
}