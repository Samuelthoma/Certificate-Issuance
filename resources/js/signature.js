// signature.js
const overlay = document.getElementById("canvasOverlay");

// Drag from sidebar
document.querySelectorAll(".signature-toolbar-item").forEach(item => {
  item.addEventListener("dragstart", e => {
    e.dataTransfer.setData("text/plain", e.target.dataset.type);
  });
});

// Drop handler using relative coords
overlay.addEventListener("dragover", e => e.preventDefault());
overlay.addEventListener("drop", e => {
  e.preventDefault();
  const type = e.dataTransfer.getData("text/plain");
  const overlayRect = overlay.getBoundingClientRect();
  const dropX = e.clientX - overlayRect.left;
  const dropY = e.clientY - overlayRect.top;

  const relX = dropX / overlay.clientWidth;
  const relY = dropY / overlay.clientHeight;

  createSignatureBox(type, relX, relY);
});

// Create box at relative position
function createSignatureBox(type, relX, relY) {
  const box = document.createElement("div");
  box.className = "signature-box absolute bg-white border-2 rounded px-2 py-1 text-xs flex items-center justify-center cursor-move";
  box.dataset.type = type;
  box.dataset.boxId = crypto.randomUUID();
  box.dataset.relX = relX;
  box.dataset.relY = relY;

  box.innerHTML = type === "typed"
    ? '<i class="fas fa-signature mr-1"></i>Typed'
    : '<i class="fas fa-font mr-1"></i>Drawn';

  positionBox(box);
  makeDraggable(box);
  box.addEventListener("click", openSignatureModal);
  box.style.pointerEvents = "auto";

  overlay.appendChild(box);
}

// Position box using relX/relY
function positionBox(box) {
  const overlayWidth = overlay.clientWidth;
  const overlayHeight = overlay.clientHeight;
  const relX = parseFloat(box.dataset.relX);
  const relY = parseFloat(box.dataset.relY);
  box.style.left = `${relX * overlayWidth}px`;
  box.style.top = `${relY * overlayHeight}px`;
}

// Draggable behavior with rel updates
function makeDraggable(el) {
  let isDragging = false, offsetX = 0, offsetY = 0;

  el.addEventListener("mousedown", e => {
    isDragging = true;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
    el.style.zIndex = 1000;
  });

  document.addEventListener("mousemove", e => {
    if (!isDragging) return;
    const overlayRect = overlay.getBoundingClientRect();
    const newLeft = Math.max(0, Math.min(e.clientX - overlayRect.left - offsetX, overlay.clientWidth - el.offsetWidth));
    const newTop = Math.max(0, Math.min(e.clientY - overlayRect.top - offsetY, overlay.clientHeight - el.offsetHeight));

    el.style.left = `${newLeft}px`;
    el.style.top = `${newTop}px`;

    el.dataset.relX = (newLeft / overlay.clientWidth).toFixed(6);
    el.dataset.relY = (newTop / overlay.clientHeight).toFixed(6);
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      el.style.zIndex = 10;
    }
  });
}

// Reposition all boxes on resize or zoom
window.addEventListener("resize", () => {
  document.querySelectorAll(".signature-box").forEach(positionBox);
});

// Signature modals
let activePlaceholder = null;
function openSignatureModal(e) {
  activePlaceholder = e.currentTarget;
  const type = activePlaceholder.dataset.type;
  if (type === "typed") {
    document.getElementById("typedSignatureModal").classList.remove("hidden");
  } else {
    document.getElementById("drawnSignatureModal").classList.remove("hidden");
  }
}

function closeTypedModal() {
  document.getElementById("typedInput").value = "";
  document.getElementById("typedSignatureModal").classList.add("hidden");
  activePlaceholder = null;
}

function closeDrawnModal() {
  clearDrawCanvas();
  document.getElementById("drawnSignatureModal").classList.add("hidden");
  activePlaceholder = null;
}

document.getElementById("applyTyped").addEventListener("click", () => {
  const typed = document.getElementById("typedInput").value.trim();
  if (typed && activePlaceholder) {
    activePlaceholder.innerHTML = `<span class='font-bold'>${typed}</span>`;
    lockBox(activePlaceholder);
    closeTypedModal();
  }
});

const drawCanvas = document.getElementById("drawCanvas");
const ctx = drawCanvas.getContext("2d");
let drawing = false;

drawCanvas.addEventListener("mousedown", () => drawing = true);
drawCanvas.addEventListener("mouseup", () => drawing = false);
drawCanvas.addEventListener("mousemove", e => {
  if (!drawing) return;
  const rect = drawCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#000";
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
});

function clearDrawCanvas() {
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  ctx.beginPath();
}

document.getElementById("applyDrawn").addEventListener("click", () => {
  const image = drawCanvas.toDataURL();
  if (image && activePlaceholder) {
    activePlaceholder.innerHTML = `<img src='${image}' class='w-full h-full object-contain' />`;
    lockBox(activePlaceholder);
    closeDrawnModal();
  }
});

function lockBox(box) {
  box.style.pointerEvents = "none";
  box.style.border = "2px solid green";
}
