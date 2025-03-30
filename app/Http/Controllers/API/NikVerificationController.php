<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\NikVerification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;

class NikVerificationController extends Controller
{


    public function showIdForm(){
        return view('auth.id-form');
    }

    public function showOcrForm(){
        return view('auth.ocr-form');
    }

/**
     * Extract NIK information from ID card image
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function extractNik(Request $request)
    {
        // Validate request and handle validation errors properly
        try {
            $validated = $request->validate([
                'id_card_image' => 'required|image|mimes:jpeg,png,jpg|max:5120', // 5MB max
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid request data',
                'errors' => $e->errors(),
            ], 422);
        }

        try {
            // Define the Python script path
            $pythonScript = app_path('python' . DIRECTORY_SEPARATOR . 'idcardocr' . DIRECTORY_SEPARATOR . 'Extract.py');

            // Check if the Python script exists BEFORE storing the image
            if (!file_exists($pythonScript)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Python script not found',
                    'script_path' => $pythonScript,
                ], 500);
            }

            // Store the uploaded image temporarily using the default disk
            $imagePath = $request->file('id_card_image')->store('temp_id_cards'); 
            $fullImagePath = storage_path('app' . DIRECTORY_SEPARATOR . 'private' . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $imagePath));       

            // Determine correct Python command
            $pythonCommand = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' ? 'python' : 'python3';

            // Create the process without escapeshellarg (Process handles escaping internally)
            $process = new Process([
                $pythonCommand,
                $pythonScript,
                $fullImagePath
            ]);

            $process->run();

            // Check if the process was successful
            if (!$process->isSuccessful()) {
                throw new ProcessFailedException($process);
            }

            // Parse the output from Python script
            $extractedData = $this->parseOutputToJson($process->getOutput());

            // Remove the temporary image after processing
            Storage::delete($imagePath);

            return response()->json([
                'success' => true,
                'message' => 'NIK data extracted successfully',
                'data' => $extractedData
            ]);

        } catch (\Exception $e) {
            // Clean up any temporary files if they exist
            if (isset($imagePath) && Storage::exists($imagePath)) {
                Storage::delete($imagePath);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to extract NIK data',
                'error' => $e->getMessage(),
                'debug' => [
                    'command' => $pythonCommand ?? 'undefined',
                    'script_path' => $pythonScript ?? 'undefined',
                    'image_path' => $fullImagePath ?? 'undefined',
                ],
            ], 500);
        }
    }

    /**
     * Parse the Python script output to extract relevant data
     *
     * @param string $output
     * @return array
     */
    private function parseOutputToJson($output)
    {
        $data = [
            'NIK' => 'Not found',
            'Nama' => 'Not found',
            'Tanggal Lahir' => 'Not found'
        ];

        // Extract the correct section
        if (preg_match('/✅ Final Extracted Data:\s*(.*?)(?:$|\n\n)/is', $output, $matches)) {
            $extractedSection = trim($matches[1]);

            // More flexible regex to handle variations in output format
            if (preg_match('/NIK\s*[:=]\s*(\d{16})/i', $extractedSection, $nikMatch)) {
                $data['NIK'] = trim($nikMatch[1]);
            }

            if (preg_match('/Nama\s*[:=]\s*(.+)/i', $extractedSection, $namaMatch)) {
                $data['Nama'] = trim($namaMatch[1]);
            }

            if (preg_match('/Tanggal\s*Lahir\s*[:=]\s*(.+)/i', $extractedSection, $tanggalMatch)) {
                $data['Tanggal Lahir'] = trim($tanggalMatch[1]);
            }
        }

        return $data;
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
