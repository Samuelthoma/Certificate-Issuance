import { loadPrivateKey } from './cryptoUtils.js';
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
        const documentList = document.getElementById("documentList");

        documents.forEach(doc => {
            const item = document.createElement("div");
            item.className = "flex items-center px-6 py-6 hover:bg-gray-100 cursor-pointer rounded-md bg-white border-2 text-md font-bold";
        
            const icon = document.createElement("i");
            icon.className = "fas fa-file-pdf text-red-500 mr-4 text-xl";
        
            const text = document.createElement("span");
            text.className = "bg-gray-300 px-3 rounded-md";
            text.textContent = doc.file_name;
        
            item.appendChild(icon);
            item.appendChild(text);
        
            item.onclick = () => {
                window.location.href = `/workspace/${doc.id}`;
            }; 
        
            documentList.appendChild(item);
        });        
    }catch (error) {
        console.error("Error fetching documents:", error);
    }
});

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
