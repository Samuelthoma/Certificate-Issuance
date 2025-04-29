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
    modal.classList.remove("flex");
  }
}

// Close drawn signature modal
export function closeDrawnModal() {
  const modal = document.getElementById("drawnSignatureModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

// Open typed signature modal
export function openTypedModal(boxId, existingValue = '') {
  const modal = document.getElementById("typedSignatureModal");
  const typedInput = document.getElementById("typedInput");
  
  // Set existing value if provided
  typedInput.value = existingValue;
  
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    typedInput.focus();
  }
}

// Open drawn signature modal
export function openDrawnModal() {
  const modal = document.getElementById("drawnSignatureModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

export function setupCollaboratorHandling() {
  // Get all collaborator select dropdowns
  const collaboratorSelects = document.querySelectorAll('.collaboratorList');
  
  collaboratorSelects.forEach(select => {
    // Add change event listener
    select.addEventListener('change', function() {
      const selectedUserId = this.value;
      const currentUserId = sessionStorage.getItem('user_id');
      
      // If user selects someone other than themselves
      if (selectedUserId !== currentUserId) {
        // Configure modal warning element
        const warningElement = document.querySelector('.assignment-warning');
        if (warningElement) {
          warningElement.classList.remove('hidden');
        }
      } else {
        // Hide warning if user selects themselves
        const warningElement = document.querySelector('.assignment-warning');
        if (warningElement) {
          warningElement.classList.add('hidden');
        }
      }
    });
  });
}