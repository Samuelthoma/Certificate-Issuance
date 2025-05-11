<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\OtpController;
use App\Http\Controllers\API\NikVerificationController;
use App\Http\Controllers\RegistrationController;
use App\Http\Middleware\VerifiedRegistrationMiddleware;
use App\Http\Controllers\API\FaceVerificationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\RegistrationStepController;
use App\Http\Controllers\SharedController;
use Illuminate\Support\Facades\Auth;

//Login and Registration Routes
Route::get('/login', [AuthController::class, 'showLoginForm'])->name('login');
Route::get('/register', [AuthController::class, 'showRegisterForm'])->name('register');
Route::get('/register/check', [RegistrationStepController::class, 'checkStep'])->name('register.check');

//OTP Routes
Route::post('/send-otp', [OtpController::class, 'sendOtp'])->name('send.otp');
Route::get('/otp', [OtpController::class, 'showOtpForm'])->name('register.otp.form')->Middleware('session:otp');
Route::post('/verify-otp', [OtpController::class, 'verifyOtp']);

//OCR Routes
Route::get('/ocr-file', [NikVerificationController::class, 'showOcrFileSubmission'])->name('ocr.file');
Route::post('/update-registration-file', [NikVerificationController::class, 'OcrFileSessionUpdate']);
Route::get('/ocr-form', [NikVerificationController::class, 'showOcrForm'])->name('ocr.form');
Route::post('/update-registration-form', [NikVerificationController::class, 'OcrFormSessionUpdate']);

//Face Verification Routes
Route::get('/face-verification', [FaceVerificationController::class, 'showFaceVerification'])->name('face-verification');

// Registration Routes
Route::post('/complete-registration', [RegistrationController::class, 'completeRegistration'])->middleware(VerifiedRegistrationMiddleware::class);

// Dashboard Routes
Route::get('/dashboard', [DashboardController::class, 'showDashboard'])->name('dashboard');

//Shared With Me Routes
Route::get('/shared-with-me', [SharedController::class, 'showSharedWithMe'])->name('shared-with-me');

//Workspace Routes
Route::get('/workspace/{id}', function ($id) {
    return view('pages.workspace', ['documentId' => $id]);
});


Route::get('/debug/keys', function () {
    return view('debug.keys');
})->name('debug.keys.form');

// Debug route to test decryption
Route::post('/debug/keys', [App\Http\Controllers\OtpController::class, 'debugKeys'])->name('debug.keys');
