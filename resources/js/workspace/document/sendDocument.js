async function sendDocument() {
    const sendButton = document.getElementById('send-document-btn');
    const documentId = document.body.dataset.documentId;
    const token = sessionStorage.getItem("token");
  
    sendButton.addEventListener('click', async function () {
      const confirmation = await Swal.fire({
        title: 'Are you sure?',
        text: 'Once sent, you will no longer be able to add or modify signature boxes.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, send it!',
        cancelButtonText: 'Cancel'
      });
  
      if (confirmation.isConfirmed) {
        try {
          const response = await fetch(`/api/documents/${documentId}/send`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
  
          if (!response.ok) throw new Error('Failed to send document');
  
          await Swal.fire({
            title: 'Sent!',
            text: 'The document has been sent successfully.',
            icon: 'success',
            confirmButtonText: 'OK'
          });
  
          window.location.reload();
        } catch (error) {
          console.error(error);
          Swal.fire({
            title: 'Error!',
            text: 'Something went wrong while sending the document.',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      }
    });
  }
  
  export { sendDocument };