// Key derivation function to match PHP's hash_pbkdf2 implementation
async function deriveKeyFromPassword(password, salt, keyLength = 32, iterations = 10000) {
    // Convert hex salt to ArrayBuffer
    const hexSalt = hexToArrayBuffer(salt);
    
    // Use SubtleCrypto for PBKDF2
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Import the password as a raw key
    const passwordKey = await window.crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );
    
    // Derive the key using PBKDF2
    const derivedBits = await window.crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: hexSalt,
            iterations: iterations,
            hash: "SHA-256"
        },
        passwordKey,
        keyLength * 8 // bits
    );
    
    return new Uint8Array(derivedBits);
}

// Function to decrypt the private key to match PHP's openssl_decrypt with AES-256-CBC
async function decryptPrivateKey(encryptedKeyBase64, derivedKey) {
    try {
        // Decode the base64 encrypted data
        const encryptedData = atob(encryptedKeyBase64);
        const encryptedBytes = new Uint8Array(encryptedData.length);
        for (let i = 0; i < encryptedData.length; i++) {
            encryptedBytes[i] = encryptedData.charCodeAt(i);
        }
        
        // Extract the IV (first 16 bytes) and ciphertext
        const iv = encryptedBytes.slice(0, 16);
        const ciphertext = encryptedBytes.slice(16);
        
        // For AES-CBC, we need to use the SubtleCrypto API
        const cryptoKey = await window.crypto.subtle.importKey(
            "raw",
            derivedKey,
            { name: "AES-CBC", length: 256 },
            false,
            ["decrypt"]
        );
        
        // Decrypt the private key
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-CBC",
                iv: iv
            },
            cryptoKey,
            ciphertext
        );
        
        // Convert the decrypted buffer to a string
        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (error) {
        console.error("Decryption error:", error);
        throw new Error("Failed to decrypt private key");
    }
}

// Helper function to convert hex string to ArrayBuffer
function hexToArrayBuffer(hexString) {
    // Remove '0x' if present
    if (hexString.startsWith('0x')) {
        hexString = hexString.slice(2);
    }
    
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i/2] = parseInt(hexString.substr(i, 2), 16);
    }
    return bytes.buffer;
}

// Function to securely store the private key in sessionStorage
async function secureStorePrivateKey(privateKey, sessionKey) {
    // Encode the private key as bytes
    const encoder = new TextEncoder();
    const privateKeyBytes = encoder.encode(privateKey);
    
    // Create a CryptoKey from the session key
    const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        sessionKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
    );
    
    // Generate a random IV for GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the private key
    const encryptedData = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        cryptoKey,
        privateKeyBytes
    );
    
    // Combine IV and encrypted data
    const encryptedBytes = new Uint8Array(iv.length + encryptedData.byteLength);
    encryptedBytes.set(iv, 0);
    encryptedBytes.set(new Uint8Array(encryptedData), iv.length);
    
    // Convert to base64 for storage
    const encryptedBase64 = btoa(String.fromCharCode.apply(null, encryptedBytes));
    const sessionKeyBase64 = btoa(String.fromCharCode.apply(null, sessionKey));
    
    // Store both in sessionStorage
    sessionStorage.setItem("encryptedPrivateKey", encryptedBase64);
    sessionStorage.setItem("sessionKey", sessionKeyBase64);
}

// Function to retrieve the private key from sessionStorage
async function retrievePrivateKey() {
    const encryptedBase64 = sessionStorage.getItem("encryptedPrivateKey");
    const sessionKeyBase64 = sessionStorage.getItem("sessionKey");
    
    if (!encryptedBase64 || !sessionKeyBase64) {
        return null;
    }
    
    try {
        // Decode the base64 data
        const encryptedData = atob(encryptedBase64);
        const encryptedBytes = new Uint8Array(encryptedData.length);
        for (let i = 0; i < encryptedData.length; i++) {
            encryptedBytes[i] = encryptedData.charCodeAt(i);
        }
        
        const sessionKeyData = atob(sessionKeyBase64);
        const sessionKey = new Uint8Array(sessionKeyData.length);
        for (let i = 0; i < sessionKeyData.length; i++) {
            sessionKey[i] = sessionKeyData.charCodeAt(i);
        }
        
        // Extract IV (first 12 bytes) and ciphertext
        const iv = encryptedBytes.slice(0, 12);
        const ciphertext = encryptedBytes.slice(12);
        
        // Create a CryptoKey from the session key
        const cryptoKey = await window.crypto.subtle.importKey(
            "raw",
            sessionKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
        );
        
        // Decrypt the private key
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            cryptoKey,
            ciphertext
        );
        
        // Convert to string
        const decoder = new TextDecoder();
        const privateKey = decoder.decode(decryptedBuffer);
        
        return privateKey;
    } catch (error) {
        console.error("Error retrieving private key:", error);
        return null;
    }
}

// Auto-load function to be called on DOMContentLoaded
async function loadPrivateKey() {
    try {
        const privateKey = await retrievePrivateKey();
        if (privateKey) {
            // Store in memory for use by the current page
            sessionStorage.setItem('private_key', privateKey); 
            // console.log("Private key retrieved from secure storage");
            return privateKey;
        }
        return null;
    } catch (error) {
        console.error("Failed to retrieve private key:", error);
        return null;
    }
}

// Export all functions to be used by other modules
export {
    deriveKeyFromPassword,
    decryptPrivateKey,
    hexToArrayBuffer,
    secureStorePrivateKey,
    retrievePrivateKey,
    loadPrivateKey
};