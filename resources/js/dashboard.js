import { loadPrivateKey } from './cryptoUtils.js';

window.onload = async function () {
    const alertMessage = sessionStorage.getItem('alertMessage');
  
    if (alertMessage) {
      await Swal.fire({
        icon: 'error',
        text: alertMessage,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
      });
  
      sessionStorage.removeItem('alertMessage');
    }
  };
  

document.addEventListener("DOMContentLoaded", async function() {
    await loadPrivateKey();
    let token = sessionStorage.getItem("token");

    if (!token) {
        window.location.href = "/login";
        return;
    }

    try {
        let response = await fetch("/api/v1/dashboard", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
        });

        if (!response.ok) {
            throw new Error("Unauthorized");
        }

        let data = await response.json();
        document.getElementById("user-email").innerText = data.user.username;
    } catch (error) {
        sessionStorage.removeItem("token");
        window.location.href = "/login";
    }

    try{
        let response = await fetch("/api/documents", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
        });

        if (!response.ok) {
            throw new Error("Unauthorized");
        }

        let documents = await response.json();
        const documentHeader = document.getElementById("documentHeader");
        const documentList = document.getElementById("documentList");

        if(documents.length > 0) {
            documentHeader.classList.remove("hidden");
        }

        documents.forEach(doc => {
            const item = document.createElement("div");
            item.className = "flex items-center px-6 py-6 hover:bg-gray-100 cursor-pointer rounded-md bg-white border-2 text-md font-bold border-r-5 border-b-5 hover:border-r-3 hover:border-b-3";
        
            const contentWrapper = document.createElement("div");
            contentWrapper.className = "flex items-center flex-1";
            item.onclick = () => {
                window.location.href = `/workspace/${doc.id}`;
            };

            const icon = document.createElement("i");
            icon.className = "fas fa-file-pdf text-red-500 mr-4 text-2xl";
        
            const text = document.createElement("span");
            text.className = "bg-gray-300 px-2 rounded-md";
            text.textContent = doc.file_name;
        
            contentWrapper.appendChild(icon);
            contentWrapper.appendChild(text);
        
            const removeSquare = document.createElement("div");
            removeSquare.className = "w-10 h-10 bg-red-500 rounded-sm flex items-center justify-center ml-4 border-3";
            removeSquare.innerHTML = `<i class="fas fa-eraser text-white text-md"></i>`;
            removeSquare.onclick = (e) => {
                e.stopPropagation();
                removeDocument(doc.id, token);
            };

            const reportSquare = document.createElement("div");
            reportSquare.className = "w-10 h-10 bg-amber-500 rounded-sm flex items-center justify-center ml-4 border-3";
            reportSquare.innerHTML = `<i class="fas fa-file text-white text-md"></i>`;
            reportSquare.onclick = (e) => {
                e.stopPropagation();
                generateReport();
            };

            item.appendChild(contentWrapper);
            item.appendChild(removeSquare);
            item.appendChild(reportSquare);
            documentList.appendChild(item);
        });        
    }catch (error) {
        console.error("Error fetching documents:", error);
    }
});

function removeDocument(docId, token) {
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

function generateReport(){
    Swal.fire({
        title: 'Report Generated',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
    })
}



document.getElementById("logoutButton").addEventListener("click", async function() {
    let token = sessionStorage.getItem("token");
    
    await fetch("/api/v1/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
    });

    sessionStorage.removeItem("token");
    window.location.href = "/login";
}); 

document.getElementById('uploadInput').addEventListener('change', async function () {
    const file = this.files[0];
    if (!file) return;

    const token = sessionStorage.getItem("token");
    if (!token) {
        alert("You're not logged in.");
        window.location.href = "/login";
        return;
    }

    const formData = new FormData();
    formData.append('file', file); // Note: match this with Laravel's `file` key

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
        window.location.href = `/workspace/${result.documentId}`; // adjust if your API returns differently
    } catch (err) {
        alert('Upload failed. Please try again.');
        console.error(err);
    }
});
