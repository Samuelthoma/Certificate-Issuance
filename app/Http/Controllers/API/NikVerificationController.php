<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\NikVerification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;


class NikVerificationController extends Controller
{


    public function showIdForm(){
        return view('auth.id-form');
    }

    public function showOcrForm()
    {
        return view('auth.ocr-form', [
            'nik' => session('ocr_nik'),
            'name' => session('ocr_name'),
            'dob' => session('ocr_dob')
        ]);
    }
    

    /**
     * Extract NIK, Name, and Date of Birth information from ID card image
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function extractNik(Request $request)
    {
        try {
            $validated = $request->validate([
                'id_card_image' => 'required|image|mimes:jpeg,png,jpg|max:5120',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid request data',
                'errors' => $e->errors(),
            ], 422);
        }
    
        try {
            // Send the image to Flask API
            $imagePath = $request->file('id_card_image')->getPathname();
            $imageName = $request->file('id_card_image')->getClientOriginalName();
    
            $client = new \GuzzleHttp\Client();
            $response = $client->post('http://127.0.0.1:5001/extract-ktp', [
                'multipart' => [
                    [
                        'name' => 'id_card_image',
                        'contents' => fopen($imagePath, 'r'),
                        'filename' => $imageName,
                    ],
                ],
            ]);
    
            $responseData = json_decode($response->getBody(), true);
    
            // Check if data key exists and has required fields
            if (!isset($responseData['data']) || 
                !isset($responseData['data']['NIK'], 
                    $responseData['data']['Nama'], 
                    $responseData['data']['Tanggal Lahir'])) {
                throw new \Exception("Invalid response format from Flask API");
            }

            // Store extracted data in session
            session([
                'ocr_nik' => $responseData['data']['NIK'],
                'ocr_name' => $responseData['data']['Nama'],
                'ocr_dob' => $responseData['data']['Tanggal Lahir']
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'KTP data extracted successfully',
                'redirect' => route('id.validation') // Redirect to the verification page
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to extract KTP data',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    

    public function verifyNik(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nik' => 'required|string|size:16',
            'name' => 'required|string|min:2',
            'dob' => 'required|date'
        ]);
    
        if ($validator->fails()) {
            return response()->json([
                'status' => 'error', 
                'message' => 'Invalid input', 
                'errors' => $validator->errors()
            ], 422);
        }
    
        $nik = $request->input('nik');
        $name = $request->input('name');
        $dob = $request->input('dob');
        
        try {
            $exists = NikVerification::verifyNik($nik);
            
            if ($exists) {
                // Get existing registration data if any
                $registrationData = session('registration_data', []);
                
                // Add the hashed NIK to the registration data
                $registrationData['nik_hash'] = bcrypt($nik);
                
                // You could also store the name and dob if needed
                $registrationData['name'] = $name;
                $registrationData['dob'] = $dob;
                
                // Update the session
                session([
                    'registration_data' => $registrationData,
                    'registration_step' => 5  
                ]);
            }
            
            return response()->json([
                'status' => $exists ? 'success' : 'fail',
                'message' => $exists ? 'NIK is valid' : 'NIK is not found',
                'data' => ['nik' => $nik, 'exists' => $exists]
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Verification service unavailable', 'error' => $e->getMessage()], 500);
        }
    }
}
