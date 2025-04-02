<?php

namespace App\Http\Middleware;

use App\Models\VerificationSession;
use Closure;
use Illuminate\Http\Request;

class VerifiedRegistrationMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $token = $request->input('verification_token');
        $sessionId = $request->input('session_id');

        // Check if this is a verified session
        $isVerified = VerificationSession::where('session_id', $sessionId)
            ->where('verification_token', $token)
            ->where('verified', true)
            ->where('expires_at', '>', now())
            ->exists();

        if (!$isVerified) {
            return response()->json([
                'success' => false,
                'message' => 'Verification required'
            ], 403);
        }

        return $next($request);
    }
}