// signature/eventHandlers.js - Event handling for boxes
let selectedBox = null; // Currently selected box for resizing

// Initialize global event handlers
export function initEventHandlers() {
  const overlay = document.getElementById("canvasOverlay");
  
  // Handle outside clicks to deselect boxes
  document.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.contains(overlay)) {
      selectedBox = null;
      document.querySelectorAll(".signature-box").forEach(b => {
        b.classList.remove("border-blue-500");
        b.classList.add("border-gray-400");
      });
    }
  });
  
  // Handle window resize to update all box positions
  window.addEventListener("resize", () => {
    import('./signatureBoxLoader.js').then(module => {
      module.loadBoxesForCurrentPage();
    });
  });
}

// Select a box
export function selectBox(box) {
  // Deselect all boxes first
  document.querySelectorAll(".signature-box").forEach(b => {
    b.classList.remove("border-blue-500");
    b.classList.add("border-gray-400");
  });
  
  // Select this box
  box.classList.remove("border-gray-400");
  box.classList.add("border-blue-500");
  selectedBox = box;
}

// Get selected box (for other modules)
export function getSelectedBox() {
  return selectedBox;
}

// Set selected box (for other modules)
export function setSelectedBox(box) {
  selectedBox = box;
}