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
            
                // Save certificate from session directly - no need to regenerate
                Certificate::create([
                    'owner_id' => $user->id,
                    'serial_number' => $registrationData['key_data']['serial_number'],
                    'certificate' => $registrationData['key_data']['certificate'],
                    'issuer' => 'MyApp CA',
                    'status' => 'active'
                ]);
            }
    
            // Update verification session with the new user ID
            $verificationSession->update([
                'user_id' => $user->id
            ]);
    
            // Clear registration data from session
            session()->forget('registration_data');
    
            DB::commit();
            session()->flush();
    
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