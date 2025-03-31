<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\OtpController;
use App\Http\Controllers\API\NikVerificationController;

Route::get('/login', [AuthController::class, 'showLoginForm'])->name('login');
Route::get('/register', [AuthController::class, 'showRegisterForm'])->name('register');
Route::get('/welcome', function () {
    return view('pages.home');
});

Route::post('/send-otp', [OtpController::class, 'sendOtp'])->name('send.otp');
Route::get('/otp', [OtpController::class, 'showOtpForm'])->name('register.otp.form')->Middleware('session:otp');
Route::post('/verify-otp', [OtpController::class, 'verifyOtp']);

Route::get('/ocr-file', [NikVerificationController::class, 'showOcrFileSubmission'])->name('ocr.file');
Route::get('/ocr-form', [NikVerificationController::class, 'showOcrForm'])->name('ocr.form');

Route::get('/face-verification', function () {
    return view('auth.face-verification'); 
})->name('face-verification');
