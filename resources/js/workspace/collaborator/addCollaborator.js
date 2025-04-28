import { getCollaborators } from "./getCollaborator.js";

async function addCollaborator() {
      const token = sessionStorage.getItem("token");
      const privateKey = sessionStorage.getItem("private_key");
      const documentId = document.body.dataset.documentId;

      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ private_key: privateKey })
      });
  
      if (!response.ok) throw new Error("Failed to fetch document");
  
      const data = await response.json();

      const fileOwner = document.getElementById("document-owner");
      fileOwner.textContent = data.file_owner + " (Owner)";

      const addColaborator = document.getElementById("add-collaborator-btn");
  
      const emailInput = document.getElementById('collaborator-email');

      addColaborator.addEventListener('click', async function() {
        const email = emailInput.value;
        emailInput.value = "";
        const documentId = data.file_id;
        
        try{
          const response = await fetch(`/api/documents/${documentId}/collaborators`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ email, private_key: privateKey })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || data.message || "Failed to add collaborator");
          }
        
          Swal.fire({
            icon: 'success',
            title: data.message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500,
          });
        
          getCollaborators();
          
        } catch (error) {
          Swal.fire({
            icon: 'error',
            title: error.message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500,
          });
        }
      });
}

export { addCollaborator };