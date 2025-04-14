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
        // if (!session()->has('registration_step') || session('registration_step') != 2) {
        //     return redirect()->route('register.check'); // Redirect to the correct step
        // }
    
        return view('auth.otp-form'); // Load OTP form only if step = 2
    }
    
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'otp' => 'required|array',
            'otp.*' => 'digits:1'
        ]);
    
        $otpCode = implode('', $request->otp);
        $registrationData = session('registration_data', []);
    
        if (!isset($registrationData['email'], $registrationData['raw_password'])) {
            session()->flash('error', 'Session expired. Please request a new OTP.');
            return back();
        }
    
        $email = $registrationData['email'];
    
        if (User::where('email', $email)->exists()) {
            session()->flash('error', 'This email is already registered.');
            return redirect()->route('register.check');
        }
    
        $otpRecord = Otp::where('email', $email)->where('otp_code', $otpCode)->first();
    
        if (!$otpRecord) {
            session()->flash('error', 'Invalid OTP. Please try again.');
            return back();
        }
    
        if (Carbon::now()->gt($otpRecord->expires_at)) {
            session()->flash('error', 'OTP has expired. Request a new one.');
            return back();
        }
    
        try {
            // 🔑 Call service to generate all key and certificate data
            $keyData = $this->keyManagementService->generateKeyDataAndCertificate($registrationData);
    
            unset($registrationData['raw_password']); // Clean up sensitive data
            $registrationData['key_data'] = $keyData;
    
            session([
                'registration_data' => $registrationData,
                'registration_step' => 3
            ]);
    
            $otpRecord->delete();
            session()->flash('success', 'OTP verified successfully.');
            return redirect()->route('ocr.file');
    
        } catch (\Exception $e) {
            Log::error('Key/Certificate generation error: ' . $e->getMessage());
            session()->flash('error', 'Failed to complete registration. Please try again.');
            return back();
        }
    }
    
}