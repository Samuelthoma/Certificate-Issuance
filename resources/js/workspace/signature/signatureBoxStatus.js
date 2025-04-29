// signature/signatureBoxStatus.js - Manages signature box status
import { drawnSignatures } from './signatureStorage.js';
import { getCurrentPage, getSignatureBoxes } from './signatureBoxManager.js';

// Update signature box status
export function updateBoxStatus(boxId, status) {
  const currentPage = getCurrentPage();
  const signatureBoxes = getSignatureBoxes();
  
  // Find the box in the DOM
  const boxElement = document.querySelector(`.signature-box[data-box-id="${boxId}"]`);
  
  if (boxElement) {
    // Update the dataset
    boxElement.dataset.status = status;
    
    // Update the status indicator
    let statusIndicator = boxElement.querySelector('.status-indicator');
    if (statusIndicator) {
      // Remove old classes and add new ones
      statusIndicator.classList.remove('bg-green-500', 'bg-yellow-500', 'text-white', 'text-black');
      
      if (status === 'active') {
        statusIndicator.classList.add('bg-green-500', 'text-white');
        statusIndicator.textContent = 'Signed';
      } else {
        statusIndicator.classList.add('bg-yellow-500', 'text-black');
        statusIndicator.textContent = 'Pending';
      }
    }
  }
  
  // Update in our data structures
  const pageBoxes = signatureBoxes[currentPage];
  
  if (pageBoxes) {
    const boxData = pageBoxes.find(box => box.id === boxId);
    if (boxData) {
      boxData.status = status;
    }
  }
  
  // Update in drawnSignatures
  if (drawnSignatures[boxId]) {
    drawnSignatures[boxId].status = status;
  } else {
    drawnSignatures[boxId] = { status };
  }
}