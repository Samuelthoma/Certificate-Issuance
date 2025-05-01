// documentLoader.js - Handles document loading and API interactions
import { renderPDF } from './pdfRenderer.js';
import { getSignatureBoxes} from '../signature/signatureBoxManager.js';
import { handlePageChange} from '../signature/signatureBoxLoader.js';
import { drawnSignatures } from '../signature/signatureStorage.js';
import { PDFDocument, rgb } from 'pdf-lib';

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
    const { file_type, file_data, file_name, isOwner } = data;

    if (file_type === "application/pdf" && file_data) {
      await renderPDF(file_data);
      
      const documentNameElement = document.getElementById("document-name");
      if (documentNameElement) {
        documentNameElement.textContent = file_name;
      }
      
      window.originalBase64Data = file_data;
      
      // Store the isOwner value in sessionStorage for use in other components
      sessionStorage.setItem("isDocumentOwner", isOwner);
      
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
      status: signature.status || "pending",
      // Element will be set when loaded in boxManager
    };
    
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

// Download functionality
function initDownloadButton() {
  const downloadBtn = document.getElementById("download-btn");
  if (!downloadBtn) return;

  downloadBtn.addEventListener("click", async function () {
    const base64 = window.originalBase64Data;
    const fileName = window.originalFileName || "document.pdf";

    if (!base64) {
      alert("No base64 data found for download.");
      return;
    }

    const rawBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
    const pdfBytes = Uint8Array.from(atob(rawBase64), c => c.charCodeAt(0));
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    const boxesByPage = getSignatureBoxes();
    const allSignatures = drawnSignatures;

    for (const [pageNumStr, boxes] of Object.entries(boxesByPage)) {
      const pageIndex = parseInt(pageNumStr) - 1;
      const page = pages[pageIndex];
      const { width, height } = page.getSize();

      for (const box of boxes) {
        const content = allSignatures[box.id];
        if (!content || box.status !== "active") continue;

        const x = box.relX * width;
        const y = (1 - box.relY - box.relHeight) * height; // Flip Y-axis for PDF-lib
        const w = box.relWidth * width;
        const h = box.relHeight * height;

        if (content.typed) {
          page.drawText(content.typed, {
            x,
            y: y + h / 2 - 6,
            size: 12,
            color: rgb(0, 0, 0),
            maxWidth: w
          });
        } else if (content.drawn) {
          const imageBase64 = content.drawn.split(",")[1];
          const imageUint8 = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
          const pngImage = await pdfDoc.embedPng(imageUint8);

          page.drawImage(pngImage, {
            x,
            y,
            width: w,
            height: h
          });
        }
      }
    }

    const modifiedPdfBytes = await pdfDoc.save();
    const blob = new Blob([modifiedPdfBytes], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 100);
  });
}

export {
  loadDocument,
  initDownloadButton
};