import { deriveKeyFromPassword, decryptPrivateKey, secureStorePrivateKey } from './cryptoUtils.js';

document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    try {
        let response = await fetch("/api/v1/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        let data = await response.json();

        if (response.ok) {
            await Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                text: 'Welcome back!',
                showConfirmButton: false,
                timer: 2000,
            });
            // Store token in sessionStorage
            sessionStorage.setItem("token", data.token);
            
            // Handle the key material
            if (data.key_material) {
                try {
                    // Derive key from password and salt using PBKDF2
                    const salt = data.key_material.kdf_salt;
                    const derivedKey = await deriveKeyFromPassword(password, salt);
                    console.log("Derived Key:", derivedKey);
                    
                    // Decrypt the private key
                    const encryptedPrivateKey = data.key_material.encrypted_private_key;
                    console.log("Encrypted Private Key:", encryptedPrivateKey);

                    const privateKey = await decryptPrivateKey(encryptedPrivateKey, derivedKey);
                    console.log("Decrypted Private Key:", privateKey);
                    
                    // Generate a random session key for storing the private key securely
                    const sessionKey = crypto.getRandomValues(new Uint8Array(32));
                    
                    // Store the private key securely
                    await secureStorePrivateKey(privateKey, sessionKey);

                    // Now we can redirect to dashboard
                    window.location.href = "/dashboard";
                } catch (keyError) {
                    console.error("Key processing error:", keyError);
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        text: 'Error processing security keys',
                        showConfirmButton: false,
                        timer: 3000,
                    });
                }
            } else {
                // If no key material, just redirect
                window.location.href = "/dashboard";
            }
        } else {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                text: 'Invalid Email or Password',
                showConfirmButton: false,
                timer: 3000,
            });
        }
    } catch (error) {
        console.error("Login error:", error);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            text: 'Error, Please Try Again',
            showConfirmButton: false,
            timer: 3000,
        });
    }
});