<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\OtpController;
use App\Http\Controllers\API\NikVerificationController;
use App\Http\Controllers\RegistrationController;
use App\Http\Middleware\VerifiedRegistrationMiddleware;
use App\Http\Controllers\RegistrationStepController;
use Illuminate\Support\Facades\Auth;

Route::get('/login', [AuthController::class, 'showLoginForm'])->name('login');
Route::get('/register', [AuthController::class, 'showRegisterForm'])->name('register');
Route::get('/register/check', [RegistrationStepController::class, 'checkStep'])->name('register.check');

Route::post('/send-otp', [OtpController::class, 'sendOtp'])->name('send.otp');
Route::get('/otp', [OtpController::class, 'showOtpForm'])->name('register.otp.form')->Middleware('session:otp');
Route::post('/verify-otp', [OtpController::class, 'verifyOtp']);

Route::get('/ocr-file', [NikVerificationController::class, 'showOcrFileSubmission'])->name('ocr.file');
Route::post('/update-registration-file', [NikVerificationController::class, 'OcrFileSessionUpdate']);
Route::get('/ocr-form', [NikVerificationController::class, 'showOcrForm'])->name('ocr.form');
Route::post('/update-registration-form', [NikVerificationController::class, 'OcrFormSessionUpdate']);

Route::get('/face-verification', function () {
    return view('auth.face-verification'); 
})->name('face-verification');

Route::post('/complete-registration', [RegistrationController::class, 'completeRegistration'])
    ->middleware(VerifiedRegistrationMiddleware::class);
Route::get('/dashboard', function () {
    return view('pages.dashboard');
})->name('dashboard');
