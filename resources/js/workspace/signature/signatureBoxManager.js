// signature/signatureBoxManager.js - Manages signature box tracking and updates
import { drawnSignatures } from './signatureStorage.js';
import { createSignatureBox } from './signatureBoxFactory.js';

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

// Add a signature box to the tracking system
export function addSignatureBox(type, left, top, width, height, targetUserId = null) {
  if (!overlay) {
    overlay = document.getElementById("canvasOverlay");
  }

  // Ensure we use the provided userId or fall back to current user
  const assignedUserId = targetUserId || sessionStorage.getItem("user_id");

  const boxId = createSignatureBox(type, left, top, width, height, assignedUserId, overlay);
  
  // Store box in our tracking object
  if (!signatureBoxes[currentPage]) {
    signatureBoxes[currentPage] = [];
  }
  
  // Calculate relative positions for storage (useful when resizing viewport)
  const relX = left / overlay.clientWidth;
  const relY = top / overlay.clientHeight;
  const relWidth = width / overlay.clientWidth;
  const relHeight = height / overlay.clientHeight;
  
  // Get the box element to store reference
  const boxElement = document.querySelector(`.signature-box[data-box-id="${boxId}"]`);
  
  // Store box data with user ID and status
  signatureBoxes[currentPage].push({
    id: boxId,
    userId: assignedUserId,
    type,
    relX,
    relY,
    relWidth,
    relHeight,
    status: "pending", // Default status is pending
    element: boxElement
  });
  
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
  
  // Make sure user ID is preserved when updating position
  boxData.userId = boxElement.dataset.userId;
}

// Update box's assigned user ID
export function updateBoxUserId(boxId, newUserId) {
  const currentPage = getCurrentPage();
  
  if (!signatureBoxes[currentPage]) return;
  
  // Find the box data in our tracking object
  const boxData = signatureBoxes[currentPage].find(box => box.id === boxId);
  if (!boxData) return;
  
  // Update the userId in both the tracking object and the DOM element
  boxData.userId = newUserId;
  
  // Update the DOM element if it exists
  if (boxData.element) {
    boxData.element.dataset.userId = newUserId;
    
    // Update any UI representation if needed
    const userLabel = boxData.element.querySelector('.user-label');
    if (userLabel) {
      userLabel.textContent = `Assigned to: ${newUserId}`;
    }
  }
  
  console.log(`Box ${boxId} reassigned to user: ${newUserId} in data store`);
}

// Get signature boxes (for external use)
export function getSignatureBoxes() {
  return signatureBoxes;
}

// Set current page (for external use)
export function setCurrentPage(page) {
  currentPage = page;
}

// Get current page
export function getCurrentPage() {
  return currentPage;
}

// Get overlay element
export function getOverlay() {
  if (!overlay) {
    overlay = document.getElementById("canvasOverlay");
  }
  return overlay;
}