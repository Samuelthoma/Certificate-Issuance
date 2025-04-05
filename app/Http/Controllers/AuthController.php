<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Laravel\Passport\HasApiTokens;

class AuthController extends Controller
{
    public function showLoginForm() {
        return view('auth.login');
    }

    public function showRegisterForm() {
        // If session exists AND it's not step 1, redirect to step checker
        if (session()->has('registration_step') && session('registration_step') != 1) {
            return redirect()->route('register.check'); // Redirect to the correct step
        }
    
        // If no session or step is 1, show the registration form
        return view('auth.register-form');
    }
    

    public function login(Request $request) {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (!Auth::attempt($credentials)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $user = Auth::user();
        $token = $user->createToken('JWT Token')->accessToken;

        return response()->json([
            'token' => $token,
            'user' => $user
        ]);
    }

    public function logout(Request $request) {
        if (Auth::user()) {
            Auth::user()->tokens()->delete();
        }
        return response()->json(['message' => 'Logged out successfully']);
    }
}
