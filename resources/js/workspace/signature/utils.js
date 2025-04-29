// signature/utils.js - Utility functions
  
  // Check if point is inside element bounds
  export function isPointInElement(x, y, element) {
    const rect = element.getBoundingClientRect();
    return (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    );
  }
  
  // Calculate relative position within container
  export function getRelativePosition(x, y, container) {
    const rect = container.getBoundingClientRect();
    return {
      x: x - rect.left,
      y: y - rect.top
    };
  }
  
  // Convert absolute positioning to relative (percentage)
  export function convertToRelativePosition(absX, absY, container) {
    return {
      x: absX / container.offsetWidth,
      y: absY / container.offsetHeight
    };
  }
  
  // Convert relative (percentage) positioning to absolute
  export function convertToAbsolutePosition(relX, relY, container) {
    return {
      x: relX * container.offsetWidth,
      y: relY * container.offsetHeight
    };
  }