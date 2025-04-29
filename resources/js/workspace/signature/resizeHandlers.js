// signature/resizeHandlers.js - Box resizing functionality
import { updateBoxPosition } from './signatureBoxManager.js';
import { setResizeMode } from './dragDrop.js';
import { getSelectedBox, setSelectedBox } from './eventHandlers.js';

let resizeMode = null; // Current resize direction if any

// Add resize handles to box
export function addResizeHandles(box) {
  const positions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const cursors = {
    'nw': 'nwse-resize', 'se': 'nwse-resize',
    'ne': 'nesw-resize', 'sw': 'nesw-resize',
    'n': 'ns-resize', 's': 'ns-resize',
    'e': 'ew-resize', 'w': 'ew-resize'
  };
  
  positions.forEach(pos => {
    const handle = document.createElement("div");
    handle.className = `resize-handle resize-${pos} absolute bg-white border border-gray-400 w-3 h-3 rounded-sm`;
    handle.dataset.resize = pos;
    
    // Position the handle
    if (pos.includes('n')) handle.style.top = "-4px";
    if (pos.includes('s')) handle.style.bottom = "-4px";
    if (pos.includes('e')) handle.style.right = "-4px";
    if (pos.includes('w')) handle.style.left = "-4px";
    
    // Center handles on edges
    if (pos === 'n' || pos === 's') handle.style.left = "calc(50% - 3px)";
    if (pos === 'e' || pos === 'w') handle.style.top = "calc(50% - 3px)";
    
    // Set cursor
    handle.style.cursor = cursors[pos];
    
    // Add event listeners for resizing
    handle.addEventListener("mousedown", e => {
      e.stopPropagation();
      startResize(box, pos, e);
    });
    
    box.appendChild(handle);
  });
}

// Start resize operation
function startResize(box, direction, e) {
  e.preventDefault();
  
  resizeMode = direction;
  setResizeMode(direction);
  setSelectedBox(box);
  
  // Initial positions and dimensions
  const startX = e.clientX;
  const startY = e.clientY;
  const startWidth = box.offsetWidth;
  const startHeight = box.offsetHeight;
  const startLeft = parseFloat(box.style.left);
  const startTop = parseFloat(box.style.top);
  
  const resizeHandler = (e) => {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    // Calculate new dimensions based on resize direction
    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;
    
    // Width adjustments
    if (direction.includes('e')) {
      newWidth = Math.max(50, startWidth + dx);
    } else if (direction.includes('w')) {
      newWidth = Math.max(50, startWidth - dx);
      newLeft = startLeft + (startWidth - newWidth);
    }
    
    // Height adjustments
    if (direction.includes('s')) {
      newHeight = Math.max(50, startHeight + dy);
    } else if (direction.includes('n')) {
      newHeight = Math.max(50, startHeight - dy);
      newTop = startTop + (startHeight - newHeight);
    }
    
    // Apply new dimensions and position
    box.style.width = `${newWidth}px`;
    box.style.height = `${newHeight}px`;
    box.style.left = `${newLeft}px`;
    box.style.top = `${newTop}px`;
    
    // Update stored position and size
    updateBoxPosition(box);
  };
  
  const stopResize = () => {
    document.removeEventListener("mousemove", resizeHandler);
    document.removeEventListener("mouseup", stopResize);
    resizeMode = null;
    setResizeMode(null);
  };
  
  document.addEventListener("mousemove", resizeHandler);
  document.addEventListener("mouseup", stopResize);
}