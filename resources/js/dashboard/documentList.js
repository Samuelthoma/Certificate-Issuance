import { removeDocument, generateReport } from './documentActions.js';

async function fetchAndRenderDocuments() {
    const token = sessionStorage.getItem("token");

    try {
        const response = await fetch("/api/documents", {
            method: "GET",
            headers: { 
                "Authorization": `Bearer ${token}`, 
                "Accept": "application/json" 
            }
        });

        if (!response.ok) {
            throw new Error("Unauthorized");
        }

        const documents = await response.json();
        renderDocuments(documents);
    } catch (error) {
        console.error("Error fetching documents:", error);
    }
}

function renderDocuments(documents) {
    const documentHeader = document.getElementById("documentHeader");
    const documentList = document.getElementById("documentList");

    if (documents.length > 0) {
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
            removeDocument(doc.id);
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
}

export { fetchAndRenderDocuments };
