// Key derivation function to match PHP's hash_pbkdf2 implementation
async function deriveKeyFromPassword(password, salt, keyLength = 32, iterations = 10000) {
    console.log("Deriving key from password");
    console.log("Password:", password);
    console.log("Salt (hex):", salt);
    
    try {
        // Convert hex salt to binary array
        const saltBuffer = hexToArrayBuffer(salt);
        console.log("Salt buffer length:", saltBuffer.length);
        
        // Import the password as a key
        const passwordKey = await window.crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits"]
        );
        
        // Derive bits using PBKDF2
        const derivedBits = await window.crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: saltBuffer,
                iterations: iterations,
                hash: "SHA-256"
            },
            passwordKey,
            keyLength * 8  // Convert bytes to bits
        );
        
        console.log("Derived key success! Length:", derivedBits.byteLength);
        return new Uint8Array(derivedBits);
    } catch (error) {
        console.error("Key derivation error:", error);
        throw error;
    }
}

// Helper function to convert hex string to ArrayBuffer
function hexToArrayBuffer(hexString) {
    // Ensure even number of characters
    if (hexString.length % 2 !== 0) {
        hexString = '0' + hexString;
    }
    
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i/2] = parseInt(hexString.substring(i, i+2), 16);
    }
    return bytes;
}

// Function to decrypt the private key to match PHP's openssl_decrypt with AES-256-CBC
async function decryptPrivateKey(encryptedKeyBase64, derivedKey) {
    try {
        console.log("Starting decryption process");
        console.log("Encrypted key (base64):", encryptedKeyBase64);
        console.log("Derived key (first few bytes):", new Uint8Array(derivedKey.slice(0, 4)));
        
        // Decode the base64 encrypted data
        const encryptedData = base64ToArrayBuffer(encryptedKeyBase64);
        console.log("Decoded encrypted data length:", encryptedData.length);
        console.log("First few bytes of decoded data:", encryptedData.slice(0, 20));
        
        // Extract the IV (first 16 bytes) and ciphertext
        const iv = encryptedData.slice(0, 16);
        const ciphertext = encryptedData.slice(16);
        console.log("IV length:", iv.length);
        console.log("IV:", Array.from(iv));
        console.log("Ciphertext length:", ciphertext.length);
        
        // For AES-CBC, we need to use the SubtleCrypto API
        console.log("Importing key...");
        const cryptoKey = await window.crypto.subtle.importKey(
            "raw",
            derivedKey,
            { name: "AES-CBC", length: 256 },
            false,
            ["decrypt"]
        );
        console.log("Key imported successfully");
        
        // Decrypt the private key
        console.log("Starting decryption...");
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-CBC",
                iv: iv
            },
            cryptoKey,
            ciphertext
        );
        console.log("Decryption successful!");
        console.log("Decrypted buffer length:", decryptedBuffer.byteLength);
        
        // Convert the decrypted buffer to a string
        const decoder = new TextDecoder();
        const result = decoder.decode(decryptedBuffer);
        console.log("Decrypted text (first 20 chars):", result.substring(0, 20));
        return result;
    } catch (error) {
        console.error("Decryption error:", error);
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        throw new Error("Failed to decrypt private key: " + error.message);
    }
}

function base64ToArrayBuffer(base64) {
    try {
        const binaryString = atob(base64);
        console.log("Base64 decoded length:", binaryString.length);
        
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    } catch (error) {
        console.error("Base64 decoding error:", error);
        throw error;
    }
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