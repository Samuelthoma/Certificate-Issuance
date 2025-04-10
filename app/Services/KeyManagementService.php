<?php

namespace App\Services;

use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class KeyManagementService
{
    /**
     * Generate a public and private key pair
     * 
     * @return array Array containing private and public keys
     */
    public function generateKeyPair()
    {
        $config = [
            "digest_alg" => "sha256",
            "private_key_bits" => 2048,
            "private_key_type" => OPENSSL_KEYTYPE_RSA,
        ];

        // Attempt to generate key pair
        $res = openssl_pkey_new($config);

        if (!$res) {
            // Log all OpenSSL errors for debugging
            while ($msg = openssl_error_string()) {
                Log::error('OpenSSL Error: ' . $msg);
            }
            throw new \Exception('Failed to generate key pair');
        }

        // Export private key
        $privateKey = null;
        if (!openssl_pkey_export($res, $privateKey)) {
            while ($msg = openssl_error_string()) {
                Log::error('OpenSSL Export Error: ' . $msg);
            }
            throw new \Exception('Failed to export private key');
        }

        // Get public key details
        $publicKeyDetails = openssl_pkey_get_details($res);
        if (!$publicKeyDetails || !isset($publicKeyDetails['key'])) {
            while ($msg = openssl_error_string()) {
                Log::error('OpenSSL Public Key Error: ' . $msg);
            }
            throw new \Exception('Failed to get public key');
        }

        return [
            'private_key' => $privateKey,
            'public_key' => $publicKeyDetails['key']
        ];
    }

    
    /**
     * Generate a random salt for key derivation
     * 
     * @param int $length Length of the salt
     * @return string Random salt as a hex string
     */
    public function generateSalt($length = 16)
    {
        return bin2hex(random_bytes($length));
    }
    
    /**
     * Derive an encryption key from a password using PBKDF2
     * 
     * @param string $password User's password
     * @param string $salt Random salt
     * @param int $keyLength Length of the derived key
     * @param int $iterations Number of iterations
     * @return string Binary key
     */
    public function deriveKeyFromPassword($password, $salt, $keyLength = 32, $iterations = 10000)
    {
        return hash_pbkdf2(
            'sha256',
            $password,
            hex2bin($salt),
            $iterations,
            $keyLength,
            true
        );
    }
    
    /**
     * Encrypt the private key using the derived key
     * 
     * @param string $privateKey Private key to encrypt
     * @param string $derivedKey Key derived from password
     * @return string Base64 encoded encrypted private key
     */
    public function encryptPrivateKey($privateKey, $derivedKey)
    {
        // Generate a random IV
        $iv = random_bytes(16);
        
        // Encrypt the private key
        $encryptedPrivateKey = openssl_encrypt(
            $privateKey,
            'AES-256-CBC',
            $derivedKey,
            OPENSSL_RAW_DATA,
            $iv
        );
        
        if ($encryptedPrivateKey === false) {
            Log::error('Failed to encrypt private key: ' . openssl_error_string());
            throw new \Exception('Failed to encrypt private key');
        }
        
        // Combine IV and encrypted data and encode to base64
        return base64_encode($iv . $encryptedPrivateKey);
    }
    
    /**
     * Decrypt the private key using the derived key
     * 
     * @param string $encryptedPrivateKey Base64 encoded encrypted private key
     * @param string $derivedKey Key derived from password
     * @return string|false Decrypted private key or false on failure
     */
    public function decryptPrivateKey($encryptedPrivateKey, $derivedKey)
    {
        // Decode from base64
        $data = base64_decode($encryptedPrivateKey);
        
        // Extract IV (first 16 bytes) and ciphertext
        $iv = substr($data, 0, 16);
        $ciphertext = substr($data, 16);
        
        // Decrypt the private key
        $decryptedPrivateKey = openssl_decrypt(
            $ciphertext,
            'AES-256-CBC',
            $derivedKey,
            OPENSSL_RAW_DATA,
            $iv
        );
        
        return $decryptedPrivateKey;
    }
}