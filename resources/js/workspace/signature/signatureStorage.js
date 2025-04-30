// signature/signatureStorage.js - Signature data management

// Store signatures by box ID
export let drawnSignatures = {};

// Store a signature in memory
export function storeSignature(boxId, type, data, status) {
  if (!drawnSignatures[boxId]) {
    drawnSignatures[boxId] = {};
  }
  
  drawnSignatures[boxId][type] = data;
  drawnSignatures[boxId].status = status;
  
  return drawnSignatures[boxId];
}

// Get a signature by box ID
export function getSignature(boxId) {
  return drawnSignatures[boxId] || null;
}

// Get all signatures
export function getAllSignatures() {
  return drawnSignatures;
}

// Clear a signature
export function clearSignature(boxId) {
  if (drawnSignatures[boxId]) {
    delete drawnSignatures[boxId];
    return true;
  }
  return false;
}