// securityUtils.js - Handles canvas security settings

// Canvas security settings
function secureCanvas() {
    const canvas = document.getElementById("pdf-canvas");
    if (canvas) {
      canvas.setAttribute("draggable", "false");
      canvas.style.userSelect = "none";
      canvas.style.webkitUserDrag = "none";
      canvas.style.webkitTouchCallout = "none";
    }
    
    // Enable the overlay for interactions
    const overlay = document.getElementById("canvasOverlay");
    if (overlay) {
      overlay.style.pointerEvents = "auto";
    }
  }
  
  // Disable Context Menu
  function initContextMenuProtection() {
    document.addEventListener("contextmenu", e => e.preventDefault());
  }
  
  export {
    secureCanvas,
    initContextMenuProtection
  };