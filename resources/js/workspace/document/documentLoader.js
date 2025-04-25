// documentLoader.js - Handles document loading and API interactions
import { renderPDF } from './pdfRenderer.js';

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
    const { file_type, file_data, file_name } = data;

    if (file_type === "application/pdf" && file_data) {
      await renderPDF(file_data);
      
      const documentNameElement = document.getElementById("document-name");
      if (documentNameElement) {
        documentNameElement.textContent = file_name;
      }
      
      window.originalBase64Data = file_data;
      window.originalFileName = "Signed " + file_name;
      
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

// Download functionality
function initDownloadButton() {
  const downloadBtn = document.getElementById("download-btn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      const base64 = window.originalBase64Data;
      const fileName = window.originalFileName || "document.pdf";
      if (!base64) {
        alert("No base64 data found for download.");
        return;
      }

      const rawBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
      const byteCharacters = atob(rawBase64);
      const byteArrays = [];

      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        byteArrays.push(new Uint8Array(byteNumbers));
      }

      const blob = new Blob(byteArrays, { type: "application/pdf" });
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
}

export {
  loadDocument,
  initDownloadButton
};