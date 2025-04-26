function removeDocument(docId) {
    const token = sessionStorage.getItem("token");

    Swal.fire({
        title: 'Are you sure?',
        text: "This document will be deleted!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/api/documents/${docId}`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                }
            })
            .then(res => {
                if (res.ok) {
                    Swal.fire({
                        title: 'Deleted!',
                        text: 'Your document has been removed.',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire('Failed!', 'Unable to delete the document.', 'error');
                }
            });
        }
    });
}

function generateReport() {
    Swal.fire({
        title: 'Report Generated',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
    });
}

function setupUploadHandler() {
    const uploadInput = document.getElementById('uploadInput');

    uploadInput.addEventListener('change', async function () {
        const file = this.files[0];
        if (!file) return;

        const token = sessionStorage.getItem("token");
        if (!token) {
            alert("You're not logged in.");
            window.location.href = "/login";
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/documents/upload', {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                },
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();
            window.location.href = `/workspace/${result.documentId}`;
        } catch (err) {
            alert('Upload failed. Please try again.');
            console.error(err);
        }
    });
}

export { removeDocument, generateReport, setupUploadHandler };
