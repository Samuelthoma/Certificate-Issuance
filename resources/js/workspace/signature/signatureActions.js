// signature/signatureActions.js - Actions for signature modal buttons

import { resetDrawCanvas, isCanvasEmpty, saveDrawnSignature } from './canvasDrawing.js';
import { closeTypedModal, closeDrawnModal } from './modalHandlers.js';
import { applySignatureToBox, getCurrentBoxId } from './signatureBoxInteraction.js';

// Set up modal action buttons
export function setupModalActions() {
  // Clear canvas button
  const clearBtn = document.getElementById('clearCanvas');
  if (clearBtn) {
    clearBtn.addEventListener('click', resetDrawCanvas);
  }
  
  // Apply typed signature button
  const applyTypedBtn = document.getElementById('applyTyped');
  if (applyTypedBtn) {
    applyTypedBtn.addEventListener('click', () => {
      const typedInput = document.getElementById('typedInput');
      if (typedInput) {
        // Always provide a string value even if empty
        const inputValue = typedInput.value || '';
        const currentUserId = sessionStorage.getItem("user_id");
        applySignatureToBox(getCurrentBoxId(), inputValue, 'typed', currentUserId);
        closeTypedModal();
      }
    });
  }

  const cancelTypedBtn = document.getElementById('cancelTyped');
  const TypedModal = document.getElementById("typedSignatureModal");

  if (cancelTypedBtn) {
    cancelTypedBtn.addEventListener('click', () => {
      TypedModal.classList.add("hidden");
      TypedModal.classList.remove("flex");
    });
  }
  
  // Apply drawn signature button
  const applyDrawnBtn = document.getElementById('applyDrawn');
  if (applyDrawnBtn) {
    applyDrawnBtn.addEventListener('click', () => {
      // Ensure we always have a value, even if canvas is empty
      const selectCollaborator = document.getElementById('selectCollaborator');
      const selectedUserId = selectCollaborator ? selectCollaborator.value : sessionStorage.getItem("user_id");
      const signatureData = isCanvasEmpty() ? '' : saveDrawnSignature();
      if (signatureData !== null) { // Check for null, but allow empty string
        applySignatureToBox(getCurrentBoxId(), signatureData, 'drawn', selectedUserId);
        closeDrawnModal();
      }
    });
  }

  const cancelDrawnBtn = document.getElementById('cancelDrawn');
  const DrawnModal = document.getElementById("drawnSignatureModal");
  
  if (cancelDrawnBtn) {
    cancelDrawnBtn.addEventListener('click', () => {
      DrawnModal.classList.add("hidden");
      DrawnModal.classList.remove("flex");
    });
  }
}