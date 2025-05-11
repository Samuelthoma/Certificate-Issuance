import { removeDocument, generateReport } from './documentActions.js';

async function fetchAndRenderCollaboratorDocuments() {
    const token = sessionStorage.getItem("token");

    try {
        const response = await fetch("/api/documents/collaborating", {
            method: "GET",
            headers: { 
                "Authorization": `Bearer ${token}`, 
                "Accept": "application/json" 
            }
        });

        if (!response.ok) {
            throw new Error("Unauthorized or No documents found");
        }

        const result = await response.json();
        const documents = result.documents; 

        renderDocuments(documents);
    } catch (error) {
        console.error("Error fetching documents:", error);
    }
}


function renderDocuments(documents) {
    const documentHeader = document.getElementById("documentHeaderCollaborator");
    const documentList = document.getElementById("documentListCollaborator");

    if (documents.length > 0) {
        documentHeader.classList.remove("hidden");
        document.getElementById("noDocument").classList.add("hidden");
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
        item.appendChild(contentWrapper);
        documentList.appendChild(item);
    });
}

fetchAndRenderCollaboratorDocuments();
