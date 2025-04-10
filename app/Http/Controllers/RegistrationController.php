<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserProfile;
use App\Models\UserKey;
use App\Models\Certificate;
use App\Models\VerificationSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class RegistrationController extends Controller
{
    /**
     * Complete the registration process after successful face verification
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function completeRegistration(Request $request)
    {
        // Validate request
        $request->validate([
            'verification_token' => 'required|string',
            'session_id' => 'required|string',
        ]);
    
        $verificationToken = $request->input('verification_token');
        $sessionId = $request->input('session_id');
    
        // Verify the session and token are valid
        $verificationSession = VerificationSession::where('session_id', $sessionId)
            ->where('verification_token', $verificationToken)
            ->where('verified', true)
            ->where('expires_at', '>', now())
            ->first();
    
        if (!$verificationSession) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired verification'
            ], 400);
        }
    
        // Get registration data from session
        $registrationData = session('registration_data');
    
        if (!$registrationData) {
            return response()->json([
                'success' => false,
                'message' => 'Registration data not found'
            ], 400);
        }
    
        // Begin transaction to ensure data consistency
        try {
            DB::beginTransaction();
    
            // Create user record
            $user = User::create([
                'username' => $registrationData['username'],
                'email' => $registrationData['email'],
                'phone' => $registrationData['phone'],
                'password' => $registrationData['password'], // Already hashed from previous step
            ]);
    
            // Create user profile
            UserProfile::create([
                'user_id' => $user->id,
                'nik' => $registrationData['nik'],
                'name' => $registrationData['name'],
                'dob' => $registrationData['dob'],
            ]);
    
            // Store key data if available
            if (isset($registrationData['key_data'])) {
                // Store the encrypted private key and salt
                UserKey::create([
                    'user_id' => $user->id,
                    'encrypted_private_key' => $registrationData['key_data']['encrypted_private_key'],
                    'kdf_salt' => $registrationData['key_data']['kdf_salt']
                ]);
            
                // === Generate a certificate from public key ===
            
                $publicKeyPem = $registrationData['key_data']['public_key'];
            
                // Build certificate subject info (customize if needed)
                $dn = [
                    "countryName" => "ID",
                    "stateOrProvinceName" => "Indonesia",
                    "localityName" => "Jakarta",
                    "organizationName" => "MyApp CA",
                    "organizationalUnitName" => "User Services",
                    "commonName" => $registrationData['name'],
                    "emailAddress" => $registrationData['email'],
                ];
            
                // Convert public key PEM to OpenSSL key resource
                $publicKeyResource = openssl_pkey_get_public($publicKeyPem);
            
                // Create a dummy private key for signing (since you're the issuer)
                $caKey = openssl_pkey_new([
                    "private_key_type" => OPENSSL_KEYTYPE_RSA,
                    "private_key_bits" => 2048
                ]);
            
                // Create a certificate signing request using public key and DN
                $csr = openssl_csr_new($dn, $caKey, ["digest_alg" => "sha256"]);
            
                // Self-sign the cert for now (valid for 1 year)
                $cert = openssl_csr_sign($csr, null, $caKey, 365);
            
                // Export the cert as a PEM string
                openssl_x509_export($cert, $certOut);
            
                // Save certificate in DB
                Certificate::create([
                    'owner_id' => $user->id,
                    'serial_number' => strtoupper(Str::uuid()), // better uniqueness than uniqid
                    'certificate' => $certOut,
                    'issuer' => 'MyApp CA',
                    'status' => 'active'
                ]);
            
                // Clean up session
                if (isset($registrationData['key_data']['debug_private_key'])) {
                    unset($registrationData['key_data']['debug_private_key']);
                }
            }
    
            // Update verification session with the new user ID
            $verificationSession->update([
                'user_id' => $user->id
            ]);
    
            // Clear registration data from session
            session()->forget('registration_data');
    
            DB::commit();
    
            return response()->json([
                'success' => true,
                'message' => 'Registration completed successfully',
                'redirect' => '/login' // Or any other page you want to redirect to
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Registration error: ' . $e->getMessage());
    
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during registration. Please try again.'
            ], 500);
        }
    }
}