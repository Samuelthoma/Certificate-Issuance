// signature/canvasDrawing.js - Canvas drawing functionality for signatures

// Canvas variables
let isDrawing = false;
let drawCanvas, drawCtx;
let lastX, lastY;
let hasDrawn = false; // Track if user has drawn anything on canvas

// Set up the drawing canvas
export function setupDrawCanvas() {
  drawCanvas = document.getElementById('drawCanvas');
  if (!drawCanvas) return;
  
  drawCtx = drawCanvas.getContext('2d');
  
  // Set canvas styling
  drawCtx.lineJoin = 'round';
  drawCtx.lineCap = 'round';
  drawCtx.lineWidth = 2;
  drawCtx.strokeStyle = '#000';
  
  // Mouse event listeners
  drawCanvas.addEventListener('mousedown', startDrawing);
  drawCanvas.addEventListener('mousemove', draw);
  drawCanvas.addEventListener('mouseup', stopDrawing);
  drawCanvas.addEventListener('mouseout', stopDrawing);
  
  // Touch event listeners for mobile
  drawCanvas.addEventListener('touchstart', handleTouchStart);
  drawCanvas.addEventListener('touchmove', handleTouchMove);
  drawCanvas.addEventListener('touchend', stopDrawing);
}

// Mouse drawing handlers
function startDrawing(e) {
  isDrawing = true;
  hasDrawn = true; // User has started drawing
  [lastX, lastY] = [e.offsetX, e.offsetY];
}

function draw(e) {
  if (!isDrawing) return;
  
  drawCtx.beginPath();
  drawCtx.moveTo(lastX, lastY);
  drawCtx.lineTo(e.offsetX, e.offsetY);
  drawCtx.stroke();
  
  [lastX, lastY] = [e.offsetX, e.offsetY];
}

function stopDrawing() {
  isDrawing = false;
}

// Touch drawing handlers
function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = drawCanvas.getBoundingClientRect();
  lastX = touch.clientX - rect.left;
  lastY = touch.clientY - rect.top;
  isDrawing = true;
  hasDrawn = true; // User has started drawing
}

function handleTouchMove(e) {
  e.preventDefault();
  if (!isDrawing) return;
  
  const touch = e.touches[0];
  const rect = drawCanvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  
  drawCtx.beginPath();
  drawCtx.moveTo(lastX, lastY);
  drawCtx.lineTo(x, y);
  drawCtx.stroke();
  
  [lastX, lastY] = [x, y];
}

// Reset the drawing canvas
export function resetDrawCanvas() {
  if (!drawCtx) return;
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  hasDrawn = false; // Reset drawing flag when canvas is cleared
}

// Load a signature image to the canvas
export function loadSignatureToCanvas(signatureData) {
  if (!drawCtx) return;
  
  const img = new Image();
  img.onload = () => {
    resetDrawCanvas();
    drawCtx.drawImage(img, 0, 0);
  };
  img.src = signatureData;
}

// Check if canvas is empty
export function isCanvasEmpty() {
  if (!drawCtx) return true;
  const pixelBuffer = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height).data;
  return !pixelBuffer.some(channel => channel !== 0);
}

// Save the drawn signature as data URL
export function saveDrawnSignature() {
  if (!drawCanvas) return null;
  return drawCanvas.toDataURL('image/png');
}

// Get hasDrawn status
export function getHasDrawn() {
  return hasDrawn;
}

// Set hasDrawn status
export function setHasDrawn(value) {
  hasDrawn = value;
}