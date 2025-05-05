// signature/signatureBoxLoader.js - Handles loading signature boxes between pages
import { makeDraggable } from './dragDrop.js';
import { addResizeHandles } from './resizeHandlers.js';
import { selectBox } from './eventHandlers.js';
import { deleteSignatureBox } from './signatureBoxDeletion.js';
import { getCurrentPage, getSignatureBoxes, getOverlay, setCurrentPage, updateBoxUserId } from './signatureBoxManager.js';
import { applySignatureToBox } from './signatureBoxInteraction.js';
import { getPermissions } from '../document/documentPermissions.js';

// Function to handle page change
export function handlePageChange(newPage) {
  // Save current page before changing
  setCurrentPage(newPage);
  
  // Clear existing boxes from the overlay
  const overlay = getOverlay();
  const existingBoxes = overlay.querySelectorAll(".signature-box");
  existingBoxes.forEach(box => box.remove());
  
  // Load boxes for new page
  loadBoxesForCurrentPage();
}

// Load saved boxes for current page
export function loadBoxesForCurrentPage() {
  const overlay = getOverlay();
  const currentPage = getCurrentPage();
  const signatureBoxes = getSignatureBoxes();
  
  // Import drawnSignatures to ensure we have the latest
  Promise.all([
    import('./signatureStorage.js'),
    import('./signatureBoxInteraction.js')
  ]).then(([storageModule, interactionModule]) => {
    const drawnSignatures = storageModule.drawnSignatures;
    const applySignatureToBox = interactionModule.applySignatureToBox;
    
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
      
      // Use the stored userId from boxData, NOT the current user's ID
      const assignedUserId = userId || sessionStorage.getItem("user_id");
      const permissions = getPermissions();
      
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
      box.dataset.userId = assignedUserId; // Use the box's stored userId
      box.dataset.status = status || "pending"; // Add status to the element's dataset with default
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.width = `${width}px`;
      box.style.height = `${height}px`;
      console.log(`Loading box with userId:`, assignedUserId);
      console.log(`Box dataset:`, box.dataset);

      // Add label
      const label = document.createElement("div");
      label.className = "absolute top-0 left-0 text-xs bg-gray-100 px-1 select-none";
      label.innerHTML = type === "typed" 
        ? '<i class="fas fa-font mr-1"></i>Typed' 
        : '<i class="fas fa-signature mr-1"></i>Drawn';
      box.appendChild(label);
      
      // Add user label to visually indicate assigned user
      const userLabel = document.createElement("div");
      userLabel.className = "user-label absolute top-5 left-0 text-xs bg-blue-100 px-1 select-none";
      userLabel.textContent = `Assigned: ${assignedUserId}`;
      box.appendChild(userLabel);
      
      // Add status indicator
      const statusClass = status === "active" ? "bg-green-500 text-white" : "bg-yellow-500 text-black";
      const statusText = status === "active" ? "Signed" : "Pending";
      
      const statusIndicator = document.createElement("div");
      statusIndicator.className = `status-indicator absolute bottom-0 right-0 text-xs px-1 rounded-tl-md ${statusClass}`;
      statusIndicator.textContent = statusText;
      box.appendChild(statusIndicator);
      
      // Add resize handles
      if(permissions.canModifySignatureFields){
        addResizeHandles(box);
      }
      
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
      
      // Update element reference
      boxData.element = box;

      // Restore dbId to DOM element
      if (boxData.dbId) {
        box.dataset.dbId = boxData.dbId;
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
            applySignatureToBox(id, drawnSignatures[id].typed, "typed");
          } catch (error) {
            console.warn(`Error applying typed signature to box ${id}:`, error);
          }
        } else if (drawnSignatures[id].drawn) {
          try {
            applySignatureToBox(id, drawnSignatures[id].drawn, "drawn");
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