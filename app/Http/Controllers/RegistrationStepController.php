<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Controller;

class RegistrationStepController extends Controller
{
    public function checkStep(Request $request)
    {
        $step = session('registration_step', 1); // Default to step 1 if not set

        // Define the step-to-route mapping
        $routes = [
            1 => 'register',
            2 => 'register.otp.form',
            3 => 'ocr.file',
            4 => 'ocr.form',
            5 => 'face-verification',
        ];

        if (isset($routes[$step]) && Route::has($routes[$step])) {
            return redirect()->route($routes[$step]);
        }

        return redirect()->route('register')->with('error', 'Invalid registration step.');
    }
}
