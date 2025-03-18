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
        $request->validate([
            'email' => 'required|email'
        ]);

        $otpCode = rand(100000, 999999); 
        $expiresAt = Carbon::now()->addSeconds(30); 

        Otp::updateOrCreate(
            ['email' => $request->email],
            ['otp_code' => $otpCode, 'expires_at' => $expiresAt]
        );

        session(['otp_email' => $request->email]);
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
        $email = session('otp_email');

        if (!$email) {
            session()->flash('error', 'Session expired. Please request a new OTP.');
            return back();
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

        session(['user_email' => $email]);
        session()->flash('success', 'OTP verified successfully.');

        // Remove OTP from database and session after successful verification
        $otpRecord->delete();
        session()->forget('otp_email');
        return back();
    }
}

