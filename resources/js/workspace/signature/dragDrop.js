// signature/dragDrop.js - Drag and drop functionality
import { addSignatureBox as createSignatureBox } from './signatureBoxManager.js';
import { selectBox } from './eventHandlers.js';
import { enterBoxDrawingMode } from './boxDrawing.js';

let overlay;
let resizeMode = null;
let deleteMode = false;

// Initialize drag and drop handlers
export function initDragDropHandlers() {
  overlay = document.getElementById("canvasOverlay");
  
  // Make toolbar items draggable
  document.querySelectorAll(".signature-toolbar-item").forEach(item => {
    item.setAttribute("draggable", "true");
    item.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", e.target.dataset.type);
    });
    
    // Click handler for direct box mode
    item.addEventListener("click", e => {
      const type = e.target.closest(".signature-toolbar-item").dataset.type;
      enterBoxDrawingMode(type);
    });
  });

  // Handle drag over on overlay
  overlay.addEventListener("dragover", e => {
    e.preventDefault();
  });

  // Handle drop on overlay
  overlay.addEventListener("drop", e => {
    e.preventDefault();
    const type = e.dataTransfer.getData("text/plain");
    const overlayRect = overlay.getBoundingClientRect();
    const dropX = e.clientX - overlayRect.left;
    const dropY = e.clientY - overlayRect.top;
    
    createSignatureBox(type, dropX, dropY, 150, 50); // Default width and height
  });
}

// Make an element draggable
export function makeDraggable(el) {
  let isDragging = false, startX, startY, startLeft, startTop;
  
  el.addEventListener("mousedown", e => {
    if (resizeMode || deleteMode) return;
    
    // Select this box when starting drag
    selectBox(el);
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseFloat(el.style.left);
    startTop = parseFloat(el.style.top);
    el.style.zIndex = "100";
    
    e.stopPropagation(); // Prevent overlay mousedown
  });
  
  document.addEventListener("mousemove", e => {
    if (!isDragging) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    if (!overlay) {
      overlay = document.getElementById("canvasOverlay");
    }
    
    // Calculate new position with boundaries
    const newLeft = Math.max(0, Math.min(startLeft + dx, overlay.clientWidth - el.offsetWidth));
    const newTop = Math.max(0, Math.min(startTop + dy, overlay.clientHeight - el.offsetHeight));
    
    el.style.left = `${newLeft}px`;
    el.style.top = `${newTop}px`;
    
    // Update stored position
    import('./signatureBoxManager.js').then(module => {
      module.updateBoxPosition(el);
    });
  });
  
  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      el.style.zIndex = "10";
    }
  });
}

// Set resize mode flag
export function setResizeMode(mode) {
  resizeMode = mode;
}

// Set delete mode flag
export function setDeleteMode(mode) {
  deleteMode = mode;
}