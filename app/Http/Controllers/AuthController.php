<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\UserKey;
use App\Services\KeyManagementService;
use Laravel\Passport\HasApiTokens;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    protected $keyManagementService;

    public function __construct(KeyManagementService $keyManagementService)
    {
        $this->keyManagementService = $keyManagementService;
    }

    public function showLoginForm() {
        return view('auth.login');
    }

    public function showRegisterForm() {
        // If session exists AND it's not step 1, redirect to step checker
        if (session()->has('registration_step') && session('registration_step') != 1) {
            return redirect()->route('register.check'); 
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
    
        // Get key material to send to client
        $userKeyModel = UserKey::where('user_id', $user->id)->first();
    
        return response()->json([
            'token' => $token,
            'user' => $user,
            'key_material' => [
                'encrypted_private_key' => $userKeyModel->encrypted_private_key,
                'kdf_salt' => $userKeyModel->kdf_salt
            ]
        ]);
    }

    public function logout(Request $request) {
        if (Auth::user()) {
            Auth::user()->tokens()->delete();
        }
        return response()->json(['message' => 'Logged out successfully']);
    }
}
