<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\NikVerificationController;

Route::prefix('v1')->group(function () {
    Route::post('/verify-nik', [NikVerificationController::class, 'verify']);
});