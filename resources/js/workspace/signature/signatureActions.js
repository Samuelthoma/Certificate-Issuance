// signature/signatureActions.js - Actions for signature modal buttons

import { resetDrawCanvas, isCanvasEmpty, saveDrawnSignature } from './canvasDrawing.js';
import { closeTypedModal, closeDrawnModal } from './modalHandlers.js';
import { applySignatureToBox, getCurrentBoxId, updateBoxUserId } from './signatureBoxInteraction.js';

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
    const inputValue = typedInput ? typedInput.value || '' : '';

    const selectCollaborator = document.getElementById('selectCollaboratorTyped');
    const selectedUserId = (selectCollaborator && selectCollaborator.value) || sessionStorage.getItem("user_id") || '';
    const currentUserId = sessionStorage.getItem("user_id") || '';    
    const currentBoxId = getCurrentBoxId();

    if (selectedUserId !== currentUserId) {
      applySignatureToBox(currentBoxId, '', 'typed');
      updateBoxUserId(currentBoxId, selectedUserId);
      closeTypedModal();
      return;
    }

    applySignatureToBox(currentBoxId, inputValue, 'typed');
    closeTypedModal();
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
      const selectCollaborator = document.getElementById('selectCollaboratorDrawn');
      const selectedUserId = (selectCollaborator && selectCollaborator.value) || sessionStorage.getItem("user_id") || '';
      const currentUserId = sessionStorage.getItem("user_id") || '';      
      const currentBoxId = getCurrentBoxId();
  
      if (selectedUserId !== currentUserId) {
        console.log("user id assigning triggered");
        applySignatureToBox(currentBoxId, '', 'drawn');
        updateBoxUserId(currentBoxId, selectedUserId);
        closeDrawnModal();
        return;
      }
  
      const signatureData = isCanvasEmpty() ? '' : saveDrawnSignature();
      if (signatureData !== null) {
        console.log("user id assigning triggered");
        applySignatureToBox(currentBoxId, signatureData, 'drawn');
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