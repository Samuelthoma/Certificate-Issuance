<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\NikVerification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\UserProfile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;


class NikVerificationController extends Controller
{


    public function showOcrFileSubmission() {
        // Check if session exists and is step 3
        if (!session()->has('registration_step') || session('registration_step') != 3) {
            return redirect()->route('register.check');
        }
    
        return view('auth.ocr-file-submission');
    }
    

    public function showOcrForm() {
        // Check if session exists and is step 4
        if (!session()->has('registration_step') || session('registration_step') != 4) {
            return redirect()->route('register.check');
        }
    
        return view('auth.ocr-form-submission');
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

            if (!isset($responseData['data']) || 
                !isset($responseData['data']['NIK'], 
                    $responseData['data']['Nama'], 
                    $responseData['data']['Tanggal Lahir'])) {
                throw new \Exception("Invalid response format from Flask API");
            }

            return response()->json([
                'success' => true,
                'message' => 'KTP data extracted successfully',
                'nik' => $responseData['data']['NIK'],
                'name' => $responseData['data']['Nama'],
                'dob' => $responseData['data']['Tanggal Lahir'],
                'redirect' => route('ocr.form') // Redirect to verification page
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to extract KTP data',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function OcrFileSessionUpdate(Request $request)
    {
        session(['registration_step' => 4]);
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
            // Step 1: Verify against Dukcapil (Firebase)
            $existsInDukcapil = NikVerification::verifyNik($nik, $name, $dob);

            if (!$existsInDukcapil) {
                return response()->json([
                    'status' => 'fail',
                    'message' => 'Your Data is Not Found in Dukcapil Database',
                    'data' => ['nik' => $nik, 'exists' => false]
                ], 200);
            }

            // Step 2: Check if NIK already exists in local database
            $existsInApp = UserProfile::get()->contains(function ($profile) use ($nik) {
                return Hash::check($nik, $profile->nik);
            });
            
            if ($existsInApp) {
                return response()->json([
                    'status' => 'fail',
                    'message' => 'NIK already registered in this application',
                    'data' => ['nik' => $nik, 'exists' => true, 'registered' => true]
                ], 200);
            }
            // All good
            return response()->json([
                'status' => 'success',
                'message' => 'NIK is valid and not yet registered in the application',
                'data' => ['nik' => $nik, 'exists' => true, 'registered' => false]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Verification service unavailable',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    public function OcrFormSessionUpdate(Request $request)
    {
        $request->validate([
            'nik'  => 'required|string|size:16',
            'name' => 'required|string|min:2',
            'dob'  => 'required|date',
        ]);
    
        // Get existing session data
        $registrationData = session('registration_data', []);
    
        // Add new data while preserving the existing session structure
        $registrationData['nik'] = bcrypt($request->nik);
        $registrationData['name'] = $request->name;
        $registrationData['dob'] = $request->dob;
    
        // Update session
        session(['registration_data' => $registrationData]);
        session(['registration_step' => 5]);
    
        return response()->json(['message' => 'NIK data stored successfully'], 200);
    }
}
