// documentLoader.js - Handles document loading and API interactions
import { renderPDF } from './pdfRenderer.js';
import { getSignatureBoxes} from '../signature/signatureBoxManager.js';
import { handlePageChange} from '../signature/signatureBoxLoader.js';
import { drawnSignatures } from '../signature/signatureStorage.js';

async function loadDocument() {
  const documentId = document.body.dataset.documentId;
  if (!documentId) {
    console.error("No document ID found");
    return;
  }
  
  const token = sessionStorage.getItem("token");
  const privateKey = sessionStorage.getItem("private_key");

  if (!token || !privateKey) {
    console.error("Missing authentication information");
    return;
  }

  try {
    const response = await fetch(`/api/documents/${documentId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ private_key: privateKey })
    });

    if (!response.ok) {
      sessionStorage.setItem('alertMessage', 'Document not found');
      window.location.href = "/dashboard";
      return null;
    }

    const data = await response.json();
    const { file_type, file_data, file_name, isOwner, status } = data;

    // Later, in the same function where we store isOwner, store the status as well:

    // Store the isOwner value in sessionStorage for use in other components
    sessionStorage.setItem("isDocumentOwner", isOwner);
    // Store the status in sessionStorage
    sessionStorage.setItem("documentStatus", status);

    if (file_type === "application/pdf" && file_data) {
      await renderPDF(file_data);
      
      const documentNameElement = document.getElementById("document-name");
      if (documentNameElement) {
        documentNameElement.textContent = file_name;
      }
      
      window.originalBase64Data = file_data;
      
      
      // After document is loaded, fetch signatures
      await loadSignatures(documentId);
      
      return data;
    } else {
      console.error("Unsupported file type or missing data");
      return null;
    }
  } catch (err) {
    console.error("Error loading document:", err);
    return null;
  }
}

/**
 * Fetch signatures for the document and initialize them in the UI
 * @param {string} documentId - Document ID to fetch signatures for
 */
async function loadSignatures(documentId) {
  try {
    const token = sessionStorage.getItem("token");
    
    const response = await fetch(`/api/signatures/${documentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error("Failed to fetch signatures:", response.status);
      return;
    }
    
    const data = await response.json();
    
    if (data.success && data.signatures && Array.isArray(data.signatures)) {
      // Initialize the signature data structures
      initializeSignatureData(data.signatures);
      
      // Trigger box rendering for the current page
      // Assuming page 1 is the default
      handlePageChange(1);
    }
  } catch (err) {
    console.error("Error loading signatures:", err);
  }
}

/**
 * Initialize signature data structures with fetched data
 * @param {Array} signatures - Signatures from the API
 */
function initializeSignatureData(signatures) {
  // Get the current user ID
  const currentUserId = sessionStorage.getItem("user_id");
  
  // Group signatures by page
  const signaturesByPage = {};
  
  // Initialize drawnSignatures from imported module
  const localDrawnSignatures = drawnSignatures || {};
  
  signatures.forEach(signature => {
    const page = signature.page;
    
    // Initialize the page array if it doesn't exist
    if (!signaturesByPage[page]) {
      signaturesByPage[page] = [];
    }
    
    // Generate a UUID for frontend use 
    // (or use the database ID as a string for simplicity)
    const boxId = `sig-${signature.id}`;
    
    // Create the box data structure expected by boxManager
    const boxData = {
      id: boxId,
      dbId: signature.id, // Store the database ID for later use
      userId: signature.user_id,
      type: signature.type,
      relX: parseFloat(signature.rel_x),
      relY: parseFloat(signature.rel_y),
      relWidth: parseFloat(signature.rel_width),
      relHeight: parseFloat(signature.rel_height),
      status: signature.status || "active",
      // Element will be set when loaded in boxManager
    };
    console.log(signature.status);
    // Add to page collection
    signaturesByPage[page].push(boxData);
    
    // Initialize in drawnSignatures
    localDrawnSignatures[boxId] = {
      status: signature.status || "pending"
    };
    
    // Add signature content if available
    if (signature.content) {
      if (signature.type === 'typed') {
        localDrawnSignatures[boxId].typed = signature.content;
      } else if (signature.type === 'drawn') {
        localDrawnSignatures[boxId].drawn = signature.content;
      }
    }
  });
  
  // Get current signature boxes structure
  const currentBoxes = getSignatureBoxes() || {};
  
  // Merge the new signature data with any existing data
  Object.keys(signaturesByPage).forEach(page => {
    currentBoxes[page] = signaturesByPage[page];
  });
  
  // Now update the global drawnSignatures object
  Object.assign(drawnSignatures, localDrawnSignatures);
}

export {
  loadDocument
};