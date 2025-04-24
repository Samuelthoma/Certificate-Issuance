async function getCollaborators() {
    const documentId = document.body.dataset.documentId;
    const token = sessionStorage.getItem("token");
  
    try {
      const response = await fetch(`/api/documents/getCollaborators/${documentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });
  
      if (!response.ok) throw new Error("Failed");
  
      const result = await response.json();
      const collaboratorList = document.getElementById("collaborators");
  
      // Loop through the collaborators
      result.collaborators.forEach(user => {
        // Check if this user is already in the list to avoid duplicates
        if (!isUserInList(user.email)) {
          const div = document.createElement("div");
          div.classList.add("flex", "items-center", "p-1", "mb-2");
  
          const email = document.createElement("p");
          email.classList.add("text-gray-500", "truncate");
          email.textContent = user.email;
  
          const icon = document.createElement("i");
          icon.classList.add("fas", "fa-user-friends", "mr-4", "w-4", "text-gray-500");
  
          div.appendChild(icon);
          div.appendChild(email);
          collaboratorList.appendChild(div);
        }
      });
    } catch (error) {
      console.error(error);
    }
  }

  function isUserInList(email) {
    const collaboratorList = document.getElementById("collaborators");
    const existingEmails = Array.from(collaboratorList.getElementsByTagName("p"))
      .map(p => p.textContent); 
    
    return existingEmails.includes(email); 
  }

  export { getCollaborators, isUserInList };
