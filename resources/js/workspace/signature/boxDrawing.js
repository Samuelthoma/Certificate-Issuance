// signature/boxDrawing.js - Box drawing mode functionality
import { addSignatureBox } from './signatureBoxManager.js';

let overlay;
let isDrawingBox = false; // Flag for box drawing mode
let startX, startY; // Starting coordinates for box drawing

// Initialize the module
function init() {
  overlay = document.getElementById("canvasOverlay");
}

// Function to enter box drawing mode
export function enterBoxDrawingMode(type) {
  if (!overlay) {
    init();
  }

  isDrawingBox = true;
  document.body.style.cursor = 'crosshair';
  
  // Store the box type being drawn
  overlay.dataset.drawingBoxType = type;
  
  // Visual indicator for drawing mode
  const statusIndicator = document.createElement("div");
  statusIndicator.id = "drawing-mode-indicator";
  statusIndicator.className = "fixed top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded shadow";
  statusIndicator.textContent = "Drawing Mode: Click and drag to create box";
  document.body.appendChild(statusIndicator);
  
  // Add event listeners for drawing mode
  overlay.addEventListener("mousedown", handleDrawingStart);
}

// Handle start of box drawing
function handleDrawingStart(e) {
  if (!isDrawingBox) return;
  
  const overlayRect = overlay.getBoundingClientRect();
  startX = e.clientX - overlayRect.left;
  startY = e.clientY - overlayRect.top;
  
  // Create temporary visual box
  const tempBox = document.createElement("div");
  tempBox.id = "temp-drawing-box";
  tempBox.className = "absolute border-2 border-blue-500 bg-blue-100 bg-opacity-30";
  tempBox.style.left = `${startX}px`;
  tempBox.style.top = `${startY}px`;
  tempBox.style.width = "0px";
  tempBox.style.height = "0px";
  overlay.appendChild(tempBox);
  
  // Add mouse move and up events
  overlay.addEventListener("mousemove", handleDrawingMove);
  overlay.addEventListener("mouseup", handleDrawingEnd);
}

// Handle mouse movement during box drawing
function handleDrawingMove(e) {
  const tempBox = document.getElementById("temp-drawing-box");
  if (!tempBox) return;
  
  const overlayRect = overlay.getBoundingClientRect();
  const currentX = e.clientX - overlayRect.left;
  const currentY = e.clientY - overlayRect.top;
  
  // Calculate dimensions
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  
  // Calculate position (handle drawing in any direction)
  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  
  // Update temp box
  tempBox.style.width = `${width}px`;
  tempBox.style.height = `${height}px`;
  tempBox.style.left = `${left}px`;
  tempBox.style.top = `${top}px`;
}

// Handle end of box drawing
function handleDrawingEnd(e) {
  const tempBox = document.getElementById("temp-drawing-box");
  if (!tempBox) return;
  
  const type = overlay.dataset.drawingBoxType;
  const width = parseFloat(tempBox.style.width);
  const height = parseFloat(tempBox.style.height);
  const left = parseFloat(tempBox.style.left);
  const top = parseFloat(tempBox.style.top);
  
  // Remove temp box
  tempBox.remove();
  
  // Exit drawing mode
  exitDrawingMode();
  
  // Only create box if it has meaningful dimensions (at least 20x20)
  if (width > 20 && height > 20) {
    // Use addSignatureBox from signatureBoxManager.js instead of createSignatureBox
    addSignatureBox(type, left, top, width, height);
  }
}

// Exit the box drawing mode
function exitDrawingMode() {
  isDrawingBox = false;
  document.body.style.cursor = 'default';
  overlay.removeEventListener("mousedown", handleDrawingStart);
  overlay.removeEventListener("mousemove", handleDrawingMove);
  overlay.removeEventListener("mouseup", handleDrawingEnd);
  
  // Remove indicator
  const indicator = document.getElementById("drawing-mode-indicator");
  if (indicator) indicator.remove();
}

// Check if drawing mode is active
export function isInDrawingMode() {
  return isDrawingBox;
}