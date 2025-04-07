document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("drawn-signature-modal");
    const SignCanvas = document.getElementById("SignCanvas");
    const ctx = SignCanvas.getContext("2d");
    const openBtn = document.getElementById("open-drawn-signature-modal");
    const cancelBtn = document.getElementById("cancel-signature");

    if (openBtn && modal && cancelBtn) {
        openBtn.addEventListener("click", () => {
          modal.classList.remove("hidden");
          modal.classList.add("flex");
        });
    
        cancelBtn.addEventListener("click", () => {
          modal.classList.add("hidden");
          modal.classList.remove("flex");
        });
    }
    let drawing = false;
  
    function resizeCanvas() {
      SignCanvas.width = SignCanvas.offsetWidth;
      SignCanvas.height = SignCanvas.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
  
    SignCanvas.addEventListener("mousedown", (e) => {
      drawing = true;
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    });
  
    SignCanvas.addEventListener("mousemove", (e) => {
      if (!drawing) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
    });
  
    SignCanvas.addEventListener("mouseup", () => {
      drawing = false;
    });
  
    SignCanvas.addEventListener("mouseleave", () => {
      drawing = false;
    });
  
    SignCanvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = SignCanvas.getBoundingClientRect();
      ctx.beginPath();
      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
      drawing = true;
    });
  
    SignCanvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (!drawing) return;
      const touch = e.touches[0];
      const rect = SignCanvas.getBoundingClientRect();
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
      ctx.stroke();
    });
  
    SignCanvas.addEventListener("touchend", () => {
      drawing = false;
    });
  
    document.getElementById("clear-signature").addEventListener("click", () => {
      ctx.clearRect(0, 0, SignCanvas.width, SignCanvas.height);
    });
  
    document.getElementById("cancel-signature").addEventListener("click", () => {
      modal.classList.add("hidden");
      ctx.clearRect(0, 0, SignCanvas.width, SignCanvas.height);
    });
  
    document.getElementById("confirm-signature").addEventListener("click", () => {
      const dataURL = SignCanvas.toDataURL("image/png");
      console.log("Signature image data:", dataURL);
      modal.classList.add("hidden");
    });
  });
  
  

  