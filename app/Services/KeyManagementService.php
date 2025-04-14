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

    public function generateKeyDataAndCertificate(array $registrationData): array
    {
        // 1. Generate key pair
        $keyPair = $this->generateKeyPair();
        
        // 2. Generate salt and derive encryption key
        $salt = $this->generateSalt();
        $derivedKey = $this->deriveKeyFromPassword($registrationData['raw_password'], $salt);
        
        // 3. Encrypt private key
        $encryptedPrivateKey = $this->encryptPrivateKey($keyPair['private_key'], $derivedKey);
        
        // 4. Create certificate
        $privateKeyPem = $keyPair['private_key'];
        $publicKeyPem = $keyPair['public_key'];
        
        // Get CA certificate and private key
        $caPrivateKey = file_get_contents(storage_path('app/private/ca/ca.key'));
        $caCertificate = file_get_contents(storage_path('app/private/ca/ca.crt'));
        
        // Load CA private key and certificate
        $caKeyResource = openssl_pkey_get_private($caPrivateKey);
        $caCertResource = openssl_x509_read($caCertificate);
        
        if (!$caKeyResource || !$caCertResource) {
            Log::error('Failed to load CA materials: ' . openssl_error_string());
            throw new \Exception('Failed to load CA materials');
        }
        
        // Create a new private key resource from the user's private key
        $userKeyResource = openssl_pkey_get_private($privateKeyPem);
        
        if (!$userKeyResource) {
            Log::error('Failed to load user private key: ' . openssl_error_string());
            throw new \Exception('Failed to load user private key');
        }
        
        // Distinguished name for the certificate
        $dn = [
            "countryName" => "ID",
            "stateOrProvinceName" => "Indonesia",
            "localityName" => "Jakarta",
            "organizationName" => "MyApp CA",
            "organizationalUnitName" => "User Services",
            "commonName" => $registrationData['username'],
            "emailAddress" => $registrationData['email'],
        ];
        
        // Create a certificate signing request (CSR) with the user's private key
        $csr = openssl_csr_new($dn, $userKeyResource, ['digest_alg' => 'sha256']);
        
        if (!$csr) {
            Log::error('Failed to create CSR: ' . openssl_error_string());
            throw new \Exception('Failed to create CSR');
        }
        
        // Sign the CSR with the CA's private key to create a certificate
        // Generate a unique serial number (numeric)
        $serialNumberHex = bin2hex(random_bytes(8)); // 8 bytes = 64 bits, suitable for certificate serial
        $serialNumber = 12345678; // something small and safe


        // Sign the CSR with the CA's private key to create a certificate
        $userCert = openssl_csr_sign($csr, $caCertResource, $caKeyResource, 365, [
            'digest_alg' => 'sha256',
            'x509_extensions' => 'v3_req',
            'serial' => hexdec($serialNumberHex) // Convert hex to decimal for OpenSSL
        ]);
        
        if (!$userCert) {
            Log::error('Failed to sign CSR: ' . openssl_error_string());
            throw new \Exception('Failed to sign CSR');
        }
        
        // Export the certificate to PEM format
        openssl_x509_export($userCert, $certOut);
        
        // Generate a unique serial number
        $serialNumber = strtoupper(Str::uuid());
        
        // Log for debugging
        Log::debug('Generated X.509 certificate (PEM): ' . $certOut);
        Log::debug('Generated private key (PEM): ' . $privateKeyPem);
        
        // Free resources
        openssl_pkey_free($userKeyResource);
        openssl_pkey_free($caKeyResource);
        openssl_x509_free($caCertResource);
        
        // 5. Return all cryptographic material
        return [
            'public_key' => $publicKeyPem,
            'encrypted_private_key' => $encryptedPrivateKey,
            'kdf_salt' => $salt,
            'certificate' => $certOut,
            'serial_number' => $serialNumber
        ];
    }

}