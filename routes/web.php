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

Route::get('/id-validation', [NikVerificationController::class, 'showIdForm'])->name('id.validation');

Route::get('/data-verification', [NikVerificationController::class, 'showOcrForm'])->name('id.validation');

Route::get('/welcome', function () {
    return view('pages.home');
});


Route::get('/face-verification', function () {
    return view('auth.face-verification'); 
})->name('face-verification');
