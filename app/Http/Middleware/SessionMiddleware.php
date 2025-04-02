<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SessionMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, $type = null): Response
    {
        if ($type === 'otp' && !session('registration_data') || !session('registration_data')['email']) {
            return redirect()->route('register')->with('error', 'Please fill in your data first.');
        }

        if ($type === 'user_create' && !$request->session()->has('user_email')) {
            return redirect()->route('register')->with('error', 'Provide your email first.');
        }

        return $next($request);
    }
}
