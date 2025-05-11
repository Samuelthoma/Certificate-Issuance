<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use App\Models\Document;
use App\Models\DocumentAccess;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

class DocumentEncryptionService
{
    /**
     * Generate a new encryption key (DEK)
     * 
     * @return string
     */
    public function generateDek()
    {
        $dek = random_bytes(32);
        Log::debug('DEK Generated, length: ' . strlen($dek)); // Must be 32 bytes
        return $dek;
    }

    /**
     * Generate initialization vector for AES encryption
     * 
     * @return string
     */
    public function generateIv()
    {
        $iv = random_bytes(16);
        Log::debug('IV Generated, length: ' . strlen($iv)); // Must be 16 bytes
        return $iv;
    }

    /**
     * Encrypt document data using AES-256-CBC
     * 
     * @param string $data Raw data to encrypt
     * @param string $dek Data encryption key
     * @param string $iv Initialization vector
     * @return string|false Encrypted data or false on failure
     */
    public function encryptData($data, $dek, $iv)
    {
        Log::debug('Encrypting data with DEK (length: ' . strlen($dek) . ') and IV (length: ' . strlen($iv) . ')');
        return openssl_encrypt($data, 'aes-256-cbc', $dek, OPENSSL_RAW_DATA, $iv);
    }

    /**
     * Decrypt document data using AES-256-CBC
     * 
     * @param string $encryptedData Encrypted data
     * @param string $dek Data encryption key
     * @param string $iv Initialization vector
     * @return string|false Decrypted data or false on failure
     */
    public function decryptData($encryptedData, $dek, $iv)
    {
        Log::debug('Decrypting data with DEK (length: ' . strlen($dek) . ') and IV (length: ' . strlen($iv) . ')');
        return openssl_decrypt($encryptedData, 'aes-256-cbc', $dek, OPENSSL_RAW_DATA, $iv);
    }

    /**
     * Encrypt the document DEK with user's public key
     * 
     * @param string $dek Data encryption key
     * @param string $certificate Certificate containing public key
     * @return string|false Base64 encoded encrypted DEK or false on failure
     */
    public function encryptDekWithCertificate($dek, $certificate)
    {
        $certResource = openssl_x509_read($certificate);
        
        if (!$certResource) {
            Log::error('Invalid certificate');
            return false;
        }

        $publicKey = openssl_get_publickey($certResource);
        if (!$publicKey) {
            Log::error('Failed to get public key from certificate');
            return false;
        }

        $encryptedDek = null;
        $encryptSuccess = openssl_public_encrypt($dek, $encryptedDek, $publicKey);
        
        openssl_free_key($publicKey);
        
        if (!$encryptSuccess) {
            Log::error('Failed to encrypt DEK with public key');
            return false;
        }
        
        return base64_encode($encryptedDek);
    }

    /**
     * Decrypt the document DEK with user's private key
     * 
     * @param string $encryptedDek Base64 encoded encrypted DEK
     * @param string $privateKeyPem Private key in PEM format
     * @return string|false Decrypted DEK or false on failure
     */
    public function decryptDekWithPrivateKey($encryptedDek, $privateKeyPem)
    {
        $encryptedDek = base64_decode($encryptedDek);
        $privateKey = openssl_pkey_get_private($privateKeyPem);
        
        if (!$privateKey) {
            Log::error('Invalid private key');
            return false;
        }
        
        $dek = null;
        $decryptSuccess = openssl_private_decrypt($encryptedDek, $dek, $privateKey);
        openssl_free_key($privateKey);
        
        if (!$decryptSuccess) {
            Log::error('Failed to decrypt DEK with private key');
            return false;
        }
        
        Log::debug('DEK decrypted successfully, length: ' . strlen($dek));
        return $dek;
    }

    /**
     * Create an encrypted document envelope
     * 
     * @param string $encryptedData Raw encrypted data
     * @return string Base64 encoded envelope
     */
    public function createEnvelope($encryptedData)
    {
        $envelope = [
            'encrypted_data' => base64_encode($encryptedData)
        ];
        
        return base64_encode(json_encode($envelope));
    }

    /**
     * Parse an encrypted document envelope
     * 
     * @param string $envelopeData Base64 encoded envelope
     * @return array|false Decoded envelope data or false on failure
     */
    public function parseEnvelope($envelopeData)
    {
        $envelopeJson = base64_decode($envelopeData);
        $envelope = json_decode($envelopeJson, true);
        
        if (!$envelope || !isset($envelope['encrypted_data'])) {
            Log::error('Invalid envelope format');
            return false;
        }
        
        return $envelope;
    }

    /**
     * Encrypt a document for storage
     * 
     * @param string $data Data to encrypt (usually base64 encoded file content)
     * @param string $dek Data encryption key (or null to generate a new one)
     * @param string $iv Initialization vector (or null to generate a new one)
     * @return array Array containing envelope, iv, and dek
     */
    public function encryptDocument($data, $dek = null, $iv = null)
    {
        // Generate encryption keys if not provided
        if ($dek === null) {
            $dek = $this->generateDek();
        }
        
        if ($iv === null) {
            $iv = $this->generateIv();
        } else if (is_string($iv) && base64_decode($iv, true) !== false && strlen(base64_decode($iv)) === 16) {
            // If IV is provided as base64, decode it
            // Added length check to ensure we have a valid IV after decoding
            $iv = base64_decode($iv);
        }
        
        // Add safety check for IV length
        if (strlen($iv) !== 16) {
            Log::error('Invalid IV length: ' . strlen($iv) . ' bytes (must be 16 bytes)');
            return false;
        }
        
        // Encrypt the data
        $encryptedData = $this->encryptData($data, $dek, $iv);
        
        if ($encryptedData === false) {
            Log::error('Failed to encrypt document data');
            return false;
        }
        
        // Create envelope
        $envelope = $this->createEnvelope($encryptedData);
        
        return [
            'envelope' => $envelope,
            'iv' => base64_encode($iv),
            'dek' => $dek
        ];
    }

    /**
     * Re-encrypt a document using an existing document's IV and DEK
     * 
     * @param string $data Data to encrypt
     * @param Document $document Existing document with IV
     * @param string $privateKey User's private key to decrypt the DEK
     * @param string|null $encryptedDek Optional pre-fetched encrypted DEK
     * @return string|false Encrypted document envelope or false on failure
     */
public function reEncryptWithExistingKeys($data, Document $document, $privateKey, $encryptedDek = null)
{
    try {
        // Get and ensure IV is properly decoded
        $iv = $document->iv;
        
        // Debug IV before processing
        Log::debug('Re-encryption: Using IV from document (base64): ' . $iv);
        
        // Ensure IV is in raw binary format for crypto operations
        $rawIv = base64_decode($iv);
        if (!$rawIv || strlen($rawIv) !== 16) {
            Log::error('Invalid IV format or length after decoding: ' . strlen($rawIv) . ' bytes');
            return false;
        }
        
        // If encryptedDek is not provided, fetch it from the database
        if ($encryptedDek === null) {
            $documentAccess = $document->accessList()->where('user_id', Auth::user()->id)->first();
            if (!$documentAccess) {
                Log::error('No document access found for current user');
                return false;
            }
            $encryptedDek = $documentAccess->encrypted_aes_key;
        }
        
        // Debug the encrypted DEK
        Log::debug('Re-encryption: Using encrypted DEK: ' . substr($encryptedDek, 0, 16) . '...');
        
        // Decrypt the DEK using the private key
        $privateKeyPem = str_replace("\\n", "\n", $privateKey);
        $dek = $this->decryptDekWithPrivateKey($encryptedDek, $privateKeyPem);
        
        if (!$dek) {
            Log::error('Failed to decrypt DEK with private key');
            return false;
        }
        
        Log::debug('Re-encryption: DEK successfully decrypted, length: ' . strlen($dek));
        
        // Make sure data is properly encoded as a string before encryption
        // This is likely the key fix - ensure we're encrypting a string, not binary data
        if (!is_string($data)) {
            $data = (string)$data;
        }
        
        // If the data isn't already base64-encoded, encode it
        // This ensures consistent handling between initial upload and re-encryption
        if (base64_encode(base64_decode($data, true)) !== $data) {
            $data = base64_encode($data);
        }
        
        // Directly encrypt data
        $encryptedData = $this->encryptData($data, $dek, $rawIv);
        
        if ($encryptedData === false) {
            Log::error('Failed to directly encrypt data during re-encryption');
            return false;
        }
        
        // Create envelope with the encrypted data
        $envelope = $this->createEnvelope($encryptedData);
        
        return $envelope;
    } catch (\Exception $e) {
        Log::error('Exception in document re-encryption', [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return false;
    }
}

    /**
     * Decrypt a document
     * 
     * @param Document $document Document model instance
     * @param string $encryptedDek Base64 encoded encrypted DEK
     * @param string $privateKey Private key in PEM format
     * @return string|false Decrypted document content or false on failure
     */
    public function decryptDocument(Document $document, $encryptedDek, $privateKey)
    {
        try {
            // Parse the envelope
            $envelope = $this->parseEnvelope($document->encrypted_file_data);
            if (!$envelope) {
                return false;
            }
            
            // Get IV and encrypted data
            $iv = base64_decode($document->iv);
            if (!$iv || strlen($iv) !== 16) {
                Log::error('Invalid IV format or length: ' . strlen($iv) . ' bytes');
                return false;
            }
            
            $encryptedData = base64_decode($envelope['encrypted_data']);
            if (!$encryptedData) {
                Log::error('Failed to decode encrypted data from envelope');
                return false;
            }
            
            // Decrypt the DEK using the private key
            $privateKeyPem = str_replace("\\n", "\n", $privateKey);
            $dek = $this->decryptDekWithPrivateKey($encryptedDek, $privateKeyPem);
            
            if (!$dek) {
                return false;
            }
            
            // Decrypt the document content with the DEK
            $decryptedContent = $this->decryptData($encryptedData, $dek, $iv);
            
            if ($decryptedContent === false) {
                Log::error('Failed to decrypt document content');
                return false;
            }
            
            return $decryptedContent;
        } catch (\Exception $e) {
            Log::error('Exception in document decryption', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    /**
     * Store a document with encrypted data in the database
     * 
     * @param int $userId User ID
     * @param string $fileName File name
     * @param string $fileType File MIME type
     * @param int $fileSize File size in bytes
     * @param string $envelope Encrypted document envelope
     * @param string $iv Base64 encoded initialization vector
     * @param string $encryptedDek Base64 encoded encrypted DEK
     * @param string $versionType Document version type (original, duplicate, etc.)
     * @param string|null $parentDocumentId Parent document ID
     * @return Document Created document model instance
     */
    public function storeDocument($userId, $fileName, $fileType, $fileSize, $envelope, $iv, $encryptedDek, $versionType = 'original', $parentDocumentId = null)
    {
        // Create document record
        $documentId = (string) Str::uuid();
        $document = Document::create([
            'id' => $documentId,
            'user_id' => $userId,
            'file_name' => $fileName,
            'file_type' => $fileType,
            'file_size' => $fileSize,
            'encrypted_file_data' => $envelope,
            'version_type' => $versionType,
            'parent_document_id' => $parentDocumentId,
            'iv' => $iv,
        ]);
        
        // Create document access record
        DocumentAccess::create([
            'document_id' => $document->id,
            'user_id' => $userId,
            'encrypted_aes_key' => $encryptedDek,
        ]);
        
        return $document;
    }

    /**
     * Update an existing document with new encrypted data
     * 
     * @param Document $document Document model instance
     * @param string $encryptedData New encrypted data
     * @param array $additionalFields Additional fields to update
     * @return bool Success status
     */
    public function updateDocument(Document $document, $encryptedData, $additionalFields = [])
    {
        $updateData = [
            'encrypted_file_data' => $encryptedData
        ];
        
        // Merge additional fields
        if (is_array($additionalFields) && !empty($additionalFields)) {
            $updateData = array_merge($updateData, $additionalFields);
        }
        
        return $document->update($updateData);
    }
}