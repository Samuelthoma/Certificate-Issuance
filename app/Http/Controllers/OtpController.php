<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Otp;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;
use App\Mail\OtpMail;
use App\Http\Middleware\CheckSession;

class OtpController extends Controller
{

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
        return view('auth.otp-form');
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'otp' => 'required|array',
            'otp.*' => 'digits:1'
        ]);
    
        // Convert array to a single OTP string
        $otpCode = implode('', $request->otp);
    
        // Retrieve email from session
        $registrationData = session('registration_data', []);
    
        if (!isset($registrationData['email'])) {
            session()->flash('error', 'Session expired. Please request a new OTP.');
            return back();
        }
    
        $email = $registrationData['email'];
    
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
    
        // Update session to indicate step 3
        $registrationData['step'] = 3;
        session(['registration_data' => $registrationData]);
    
        // Remove OTP from database and session after successful verification
        $otpRecord->delete();
    
        session()->flash('success', 'OTP verified successfully.');
        return redirect()->route('id.validation');
    }
    
}

