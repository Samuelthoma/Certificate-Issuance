document.addEventListener("DOMContentLoaded", () => {
    const typedModal = document.getElementById("typed-signature-modal");
    const cancelBtn = document.getElementById("cancel-typed-signature");
    const confirmBtn = document.getElementById("confirm-typed-signature");
    const openTypedModalBtn = document.getElementById("open-typed-signature-modal");
    
    if (openTypedModalBtn && typedModal && cancelBtn) {
        openTypedModalBtn.addEventListener("click", () => {
          typedModal.classList.remove("hidden");
          typedModal.classList.add("flex");
        });
    
        cancelBtn.addEventListener("click", () => {
          modal.classList.add("hidden");
          modal.classList.remove("flex");
        });
    }
  
    cancelBtn.addEventListener("click", () => {
      typedModal.classList.add("hidden");
    });
  
    confirmBtn.addEventListener("click", () => {
      const typedValue = document.getElementById("typed-signature-input").value;
      if (typedValue.trim()) {
        console.log("Typed Signature:", typedValue); // <- You can update this later to apply it
        typedModal.classList.add("hidden");
      } else {
        alert("Please enter your signature.");
      }
    });
  });
  