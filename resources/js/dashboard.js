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
        const tableBody = document.getElementById("documentsBody");

        documents.forEach(doc => {
            const row = document.createElement("tr");
            row.classList.add("hover:bg-gray-100");

            const cell = document.createElement("td");
            cell.classList.add("px-4", "py-6", "text-sm", "text-gray-800", "font-semibold", "border-2", "overflow-hidden", "whitespace-nowrap", "text-ellipsis");
            cell.textContent = doc.file_name;
            cell.addEventListener("click", () => {
                window.location.href = `/workspace/${doc.id}`;
            });

            row.appendChild(cell);
            tableBody.appendChild(row);
        })
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
