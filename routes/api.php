<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\NikVerificationController;
use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;

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


