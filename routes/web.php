<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\OtpController;

Route::get('/login', [AuthController::class, 'showLoginForm'])->name('login');
Route::get('/register', [AuthController::class, 'showRegisterForm'])->name('register');
Route::get('/welcome', function () {
    return view('pages.home');
});

Route::post('/send-otp', [OtpController::class, 'sendOtp'])->name('send.otp');
Route::get('/otp', [OtpController::class, 'showOtpForm'])->name('register.otp.form')->Middleware('session:otp');
Route::post('/verify-otp', [OtpController::class, 'verifyOtp']);

Route::get('/welcome', function () {
    return view('pages.home');
});