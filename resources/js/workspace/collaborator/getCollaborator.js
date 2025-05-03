async function getCollaborators() {
  const documentId = document.body.dataset.documentId;
  const token = sessionStorage.getItem("token");
  const isOwner = sessionStorage.getItem("isDocumentOwner") === "true";

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

    result.collaborators.forEach(user => {
      if (!isUserInList(user.email)) {
        const div = document.createElement("div");
        div.classList.add("flex", "items-center", "justify-between", "p-1", "mb-2");

        const userInfo = document.createElement("div");
        userInfo.classList.add("flex", "items-center");

        const icon = document.createElement("i");
        icon.classList.add("fas", "fa-user-friends", "text-gray-500", "mr-1");

        const email = document.createElement("p");
        email.classList.add("text-gray-500", "truncate", "ml-2");
        email.textContent = user.email;

        userInfo.appendChild(icon);
        userInfo.appendChild(email);
        div.appendChild(userInfo);

        if(isOwner){
          const deleteBtn = document.createElement("button");
          deleteBtn.classList.add("text-red-500", "hover:text-red-700", "ml-2");
          deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
          deleteBtn.addEventListener("click", () => removeCollaborator(documentId, user.id));

          div.appendChild(userInfo);
          div.appendChild(deleteBtn);
        }
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

async function removeCollaborator(documentId, userId) {
  const token = sessionStorage.getItem("token");

  const result = await Swal.fire({
    title: 'Are you sure?',
    text: "This collaborator will be permanently removed from the document.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, remove'
  });

  if (!result.isConfirmed) return;

  try {
    const res = await fetch(`/api/documents/${documentId}/removeCollaborator/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) throw new Error("Failed to remove collaborator");

    await Swal.fire({
      icon: 'success',
      title: "Collaborator removed successfully",
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500,
    });

    window.location.reload();
  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to remove collaborator'
    });
  }
}

export { getCollaborators, isUserInList };
