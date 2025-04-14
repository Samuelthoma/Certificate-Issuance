<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Otp;
use App\Models\User; // Added User model import
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;
use App\Mail\OtpMail;
use App\Http\Middleware\CheckSession;
use Illuminate\Support\Facades\Log;
use App\Services\KeyManagementService;

class OtpController extends Controller
{
    protected $keyManagementService;

    public function __construct(KeyManagementService $keyManagementService)
    {
        $this->keyManagementService = $keyManagementService;
    }

    public function sendOtp(Request $request)
    {
        // Validate email only for OTP resend
        if (session('registration_step') == 2) {
            $request->validate(['email' => 'required|email']);
        } else {
            // Validate full registration data on first request
            $request->validate([
                'username' => 'required|string|max:255',
                'password' => 'required|min:6',
                'phone' => 'required|string|digits_between:10,15',
                'email' => 'required|email'
            ]);
        }

        // Check if email already exists in User table
        $existingUser = User::where('email', $request->email)->first();
        if ($existingUser) {
            return back()->withErrors([
                'email' => 'This email is already registered in our system.'
            ])->withInput($request->except('password'));
        }
    
        // Generate OTP
        $otpCode = rand(100000, 999999);
        $expiresAt = Carbon::now()->addSeconds(180);
    
        Otp::updateOrCreate(
            ['email' => $request->email],
            ['otp_code' => $otpCode, 'expires_at' => $expiresAt]
        );
    
        // Only store registration data if it's the first OTP request
        if (session('registration_step') !== 2) {
            session([
                'registration_data' => [
                    'username' => $request->username,
                    'password' => bcrypt($request->password),
                    'raw_password' => $request->password, // Temporarily store for key derivation
                    'phone' => $request->phone,
                    'email' => $request->email
                ],
                'registration_step' => 2
            ]);
        }
    
        Mail::to($request->email)->send(new OtpMail($otpCode));
        return redirect()->route('register.otp.form');
    }
    
    public function showOtpForm()
    {
        // Check if session exists and is at step 2
        if (!session()->has('registration_step') || session('registration_step') != 2) {
            return redirect()->route('register.check'); // Redirect to the correct step
        }
    
        return view('auth.otp-form'); // Load OTP form only if step = 2
    }
    
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'otp' => 'required|array',
            'otp.*' => 'digits:1'
        ]);
    
        // Convert array to a single OTP string
        $otpCode = implode('', $request->otp);
    
        // Retrieve registration data from session
        $registrationData = session('registration_data', []);
    
        if (!isset($registrationData['email']) || !isset($registrationData['raw_password'])) {
            session()->flash('error', 'Session expired. Please request a new OTP.');
            return back();
        }
    
        $email = $registrationData['email'];
    
        // Double-check email doesn't exist before proceeding with verification
        $existingUser = User::where('email', $email)->first();
        if ($existingUser) {
            session()->flash('error', 'This email is already registered.');
            return redirect()->route('register.check');
        }
    
        $otpRecord = Otp::where('email', $email)
                        ->where('otp_code', $otpCode)
                        ->first();
    
        if (!$otpRecord) {
            session()->flash('error', 'Invalid OTP. Please try again.');
            return back();
        }
    
        if (Carbon::now()->gt($otpRecord->expires_at)) {
            session()->flash('error', 'OTP has expired. Request a new one.');
            return back();
        }
    
        try {
            // Generate key pair
            $keyPair = $this->keyManagementService->generateKeyPair();
    
            // Generate salt and derive encryption key
            $salt = $this->keyManagementService->generateSalt();
            $derivedKey = $this->keyManagementService->deriveKeyFromPassword(
                $registrationData['raw_password'],
                $salt
            );
    
            // Encrypt private key
            $encryptedPrivateKey = $this->keyManagementService->encryptPrivateKey(
                $keyPair['private_key'],
                $derivedKey
            );
    
            // Remove raw password from session
            unset($registrationData['raw_password']);
    
            // Store only necessary key data
            $registrationData['key_data'] = [
                'public_key' => $keyPair['public_key'],
                'encrypted_private_key' => $encryptedPrivateKey,
                'kdf_salt' => $salt
            ];
    
            // Update session
            session([
                'registration_data' => $registrationData,
                'registration_step' => 3
            ]);
    
            // Remove used OTP
            $otpRecord->delete();
    
            session()->flash('success', 'OTP verified successfully.');
            return redirect()->route('ocr.file');
    
        } catch (\Exception $e) {
            Log::error('Key generation error: ' . $e->getMessage());
            session()->flash('error', 'Failed to complete registration. Please try again.');
            return back();
        }
    }
}