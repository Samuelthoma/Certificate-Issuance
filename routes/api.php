<?php

use App\Http\Controllers\API\DocumentSigningController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\NikVerificationController;
use App\Http\Controllers\API\FaceVerificationController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\API\SignatureController;
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
    Route::post('/login', [AuthController::class, 'login'])->name('api.login');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:api')->name('api.logout');

    Route::middleware('auth:api')->get('/dashboard', function (Request $request) {
        return response()->json([
            'message' => 'Welcome to the Dashboard',
            'user' => $request->user()
        ]);
    })->name('api.dashboard');
});

Route::middleware('auth:api')->post('/documents/upload', [DocumentController::class, 'upload']);

Route::middleware('auth:api')->post('/documents/{id}', [DocumentController::class, 'get']);

Route::middleware('auth:api')->get('/documents', [DocumentController::class, 'index']);

Route::middleware('auth:api')->delete('/documents/{id}', [DocumentController::class, 'destroy']);

Route::middleware('auth:api')->post('/documents/{id}/collaborators', [DocumentController::class, 'addCollaborator']);

Route::middleware('auth:api')->post('/documents/getCollaborators/{documentId}', [DocumentController::class, 'getCollaborators']);

Route::middleware('auth:api')->delete('/documents/{id}/removeCollaborator/{userId}', [DocumentController::class, 'removeCollaborator']);

Route::middleware('auth:api')->post('/signatures/save-draft', [SignatureController::class, 'saveDraft']);

Route::middleware('auth:api')->post('/documents/{id}/send', [DocumentController::class, 'sendDocument']);

Route::middleware('auth:api')->get('/documents/collaborating', [DocumentController::class, 'getCollaboratorDocuments']);

Route::get('/signatures/{document_id}', [SignatureController::class, 'getSignatures']);

Route::middleware('auth:api')->post('/signatures/initiate-signing', [DocumentSigningController::class, 'initiateSigningProcess']); 

Route::middleware('auth:api')->post('/signatures/complete-signing', [DocumentSigningController::class, 'completeSigningProcess']);