<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Otp;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;
use App\Mail\OtpMail;

class OtpController extends Controller
{
    public function sendOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $otpCode = rand(100000, 999999); 
        $expiresAt = Carbon::now()->addMinutes(5); 

        Otp::updateOrCreate(
            ['email' => $request->email],
            ['otp_code' => $otpCode, 'expires_at' => $expiresAt]
        );

        // Send OTP via email
        Mail::to($request->email)->send(new OtpMail($otpCode));
        session()->flash('success', 'OTP has been sent to your email.');

        return back();
    }
}

