<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\NikVerification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class NikVerificationController extends Controller
{
    /**
     * Verify if NIK exists in the database
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function verify(Request $request)
    {
        // Validate input
        $validator = Validator::make($request->all(), [
            'nik' => 'required|string|size:16', // Assuming NIK is 16 characters
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid NIK format',
                'errors' => $validator->errors()
            ], 422);
        }

        $nik = $request->input('nik');
        
        try {
            $exists = NikVerification::verifyNik($nik);
            
            return response()->json([
                'status' => $exists ? 'success' : 'fail',
                'message' => $exists ? 'NIK is valid' : 'NIK is not found',
                'data' => [
                    'nik' => $nik,
                    'exists' => $exists
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Verification service unavailable',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}