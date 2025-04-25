// signature/modalHandlers.js - Modal handling functions

// Initialize modal handlers
export function initModalHandlers() {
    // Add event listeners for modal close buttons
    document.addEventListener("DOMContentLoaded", function() {
      // Add event listeners for modal close buttons
      const cancelButtons = document.querySelectorAll("#typedSignatureModal button, #drawnSignatureModal button");
      cancelButtons.forEach(button => {
        if (button.textContent.includes("Cancel")) {
          button.addEventListener("click", () => {
            closeTypedModal();
            closeDrawnModal();
          });
        }
      });
    });
  }
  
  // Close typed signature modal
  export function closeTypedModal() {
    const modal = document.getElementById("typedSignatureModal");
    if (modal) {
      modal.classList.add("hidden");
    }
  }
  
  // Close drawn signature modal
  export function closeDrawnModal() {
    const modal = document.getElementById("drawnSignatureModal");
    if (modal) {
      modal.classList.add("hidden");
    }
  }
  
  // Open typed signature modal
  export function openTypedModal() {
    const modal = document.getElementById("typedSignatureModal");
    if (modal) {
      modal.classList.remove("hidden");
    }
  }
  
  // Open drawn signature modal
  export function openDrawnModal() {
    const modal = document.getElementById("drawnSignatureModal");
    if (modal) {
      modal.classList.remove("hidden");
    }
  }