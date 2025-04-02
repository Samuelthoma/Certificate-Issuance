<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\NikVerificationController;
use App\Http\Controllers\API\FaceVerificationController;
use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;


Route::post('/verify-nik', [NikVerificationController::class, 'verifyNik']);
Route::post('/extract-nik', [NikVerificationController::class, 'extractNik']);

Route::prefix('face-verification')->group(function () {
    Route::post('/start', [FaceVerificationController::class, 'startSession']);
    Route::post('/detect', [FaceVerificationController::class, 'detectFace']);
    Route::post('/verify-liveness', [FaceVerificationController::class, 'verifyLiveness']);
    Route::post('/complete', [FaceVerificationController::class, 'completeVerification']);
    Route::post('/verify-token', [FaceVerificationController::class, 'verifyToken']);
    Route::post('/cleanup', [FaceVerificationController::class, 'cleanup']);
});

Route::prefix('v1')->group(function () {
    Route::post('/verify-nik', [NikVerificationController::class, 'verify']);
    Route::post('/login', [AuthController::class, 'login'])->name('api.login');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:api')->name('api.logout');

    Route::middleware('auth:api')->get('/dashboard', function (Request $request) {
        return response()->json([
            'message' => 'Welcome to the Dashboard',
            'user' => $request->user()
        ]);
    })->name('api.dashboard');
});


