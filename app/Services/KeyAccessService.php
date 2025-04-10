<?php

namespace App\Services;

use App\Models\UserKey;
use App\Services\KeyManagementService;
use Illuminate\Support\Facades\Log;

class KeyAccessService
{
    protected $keyManagementService;
    
    public function __construct(KeyManagementService $keyManagementService)
    {
        $this->keyManagementService = $keyManagementService;
    }
    
    /**
     * Get the decrypted private key for a user
     * 
     * @param int $userId User ID
     * @param string $password User's password
     * @return string|null Decrypted private key or null on failure
     */
    public function getPrivateKey($userId, $password)
    {
        $userKey = UserKey::where('user_id', $userId)->first();
        
        if (!$userKey) {
            Log::error("No key found for user ID: {$userId}");
            return null;
        }
        
        // Derive key from password using stored salt
        $derivedKey = $this->keyManagementService->deriveKeyFromPassword(
            $password,
            $userKey->kdf_salt
        );
        
        // Decrypt the private key
        $privateKey = $this->keyManagementService->decryptPrivateKey(
            $userKey->encrypted_private_key,
            $derivedKey
        );
        
        if ($privateKey === false) {
            Log::error("Failed to decrypt private key for user ID: {$userId}");
            return null;
        }
        
        return $privateKey;
    }
}