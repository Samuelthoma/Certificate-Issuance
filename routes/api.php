<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\NikVerificationController;

Route::post('/verify-nik', [NikVerificationController::class, 'verify']);
Route::post('/extract-nik', [NikVerificationController::class, 'extractNikFromImage']);
