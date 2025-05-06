// documentPermissions.js - Handles document permission controls
/**
 * Manages document permissions based on document status and user role
 * Returns boolean values for UI control
 */

let documentPermissions = {
  // Document editing permissions
  canModifySignatureFields: false,
  canAddCollaborators: false,
  canSaveDraft: false,
  canSendDocument: false,
  
  // Signature permissions
  canSign: false,
  canFinalizeDocument: false,
  canRejectSignature: false,
  
  // Document state control
  canRevokeDocument: false,
  canRejectDocument: false,
};

/**
 * Initialize document permissions based on document status and ownership
 * @param {string} status - Document status (draft, pending, finalized, revoked)
 * @param {boolean} isOwner - Whether the current user is the document owner
 * @returns {Object} - Object containing boolean permission flags
 */
function initializePermissions(status, isOwner) {
  // Reset all permissions to false
  Object.keys(documentPermissions).forEach(key => {
    documentPermissions[key] = false;
  });
  
  // Set permissions based on document status and ownership
  switch(status) {
    case 'draft':
      if (isOwner) {
        documentPermissions.canModifySignatureFields = true;
        documentPermissions.canAddCollaborators = true;
        documentPermissions.canSaveDraft = true;
        documentPermissions.canSendDocument = true;
      }
      // If not owner and draft: View only (all permissions remain false)
      break;
      
    case 'pending':
      if (isOwner) {
        documentPermissions.canFinalizeDocument = true;
        documentPermissions.canRejectSignature = true;
        documentPermissions.canSign = true;
      } else {
        documentPermissions.canSign = true;
        documentPermissions.canRejectDocument = true;
      }
      break;
      
    case 'finalized':
      if (isOwner) {
        documentPermissions.canRevokeDocument = true;
      }
      // If not owner and finalized: View only (all permissions remain false)
      break;
      
    case 'revoked':
      // No permissions for revoked documents (all permissions remain false)
      break;
      
    default:
      console.warn(`Unknown document status: ${status}`);
  }
  
  // Store permissions in sessionStorage for access across components
  sessionStorage.setItem('documentPermissions', JSON.stringify(documentPermissions));
  
  return documentPermissions;
}

/**
 * Get current document permissions
 * @returns {Object} - Object containing boolean permission flags
 */
function getPermissions() {
  // Try to get from sessionStorage first
  const storedPermissions = sessionStorage.getItem('documentPermissions');
  if (storedPermissions) {
    try {
      return JSON.parse(storedPermissions);
    } catch (e) {
      console.error('Error parsing stored permissions:', e);
    }
  }
  
  // Return default permissions if not in sessionStorage
  return documentPermissions;
}

/**
 * Check if a specific permission is granted
 * @param {string} permissionName - Name of the permission to check
 * @returns {boolean} - Whether the permission is granted
 */
function hasPermission(permissionName) {
  const permissions = getPermissions();
  return permissions[permissionName] === true;
}

export {
  initializePermissions,
  getPermissions,
  hasPermission
};