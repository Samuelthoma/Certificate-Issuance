<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\NikVerificationController;

use App\Http\Controllers\API\FaceVerificationController;

Route::post('/verify-nik', [NikVerificationController::class, 'verify']);
Route::post('/extract-nik', [NikVerificationController::class, 'extractNikFromImage']);

Route::get('/face-verification', function () {
    return view('face-verification');
});
Route::prefix('face-verification')->group(function () {
    Route::post('/start', [FaceVerificationController::class, 'startSession']);
    Route::post('/detect', [FaceVerificationController::class, 'detectFace']);
    Route::post('/verify-liveness', [FaceVerificationController::class, 'verifyLiveness']);
    Route::post('/complete', [FaceVerificationController::class, 'completeVerification']);
    Route::post('/verify-token', [FaceVerificationController::class, 'verifyToken']);
});
