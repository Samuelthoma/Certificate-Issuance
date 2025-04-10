<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\VerificationSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;

class FaceVerificationController extends Controller
{
    /**
     * Start a verification session
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */

    public function showFaceVerification()
    {
        if (!session()->has('registration_step') || session('registration_step') != 5) {
            return redirect()->route('register.check');
        }
        return view('auth.face-verification'); 
    }

    public function startSession(Request $request)
    {
        // Generate a unique session ID
        $sessionId = (string) Str::uuid();
        
        // Create session in database
        $session = VerificationSession::create([
            'session_id' => $sessionId,
            'user_id' => Auth::id(), // If authenticated
            'expires_at' => now()->addHours(1) // Sessions expire after 1 hour
        ]);
        
        return response()->json([
            'success' => true,
            'session_id' => $sessionId,
            'message' => 'Verification session started',
            'expires_at' => $session->expires_at
        ]);
    }

    /**
     * Process face detection
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function detectFace(Request $request)
    {
        try {
            $request->validate([
                'image' => 'required|image|max:5120', // 5MB max
                'session_id' => 'required|string'
            ]);
            
            $sessionId = $request->input('session_id');
            
            // Find session
            $session = VerificationSession::where('session_id', $sessionId)
                ->where('expires_at', '>', now())
                ->first();
                
            if (!$session) {
                // Cleanup on invalid session
                $this->cleanupSessionFiles($sessionId);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired session',
                    'error_code' => 'INVALID_SESSION'
                ], 400);
            }
            
            // Create directory structure for this session's files
            $sessionDir = 'face_verification' . DIRECTORY_SEPARATOR . $sessionId;
            $storageBasePath = storage_path('app');
            $sessionPath = $storageBasePath . DIRECTORY_SEPARATOR . $sessionDir;
            
            // Create directory if it doesn't exist
            if (!file_exists($sessionPath)) {
                mkdir($sessionPath, 0755, true);
            }
            
            $image = $request->file('image');
            $fileName = $sessionId . '_initial.' . $image->getClientOriginalExtension();
            $fullImagePath = $sessionPath . DIRECTORY_SEPARATOR . $fileName;
            
            // Store the image using direct file operations rather than Laravel's storage
            if (!$image->move($sessionPath, $fileName)) {
                // Cleanup on image save failure
                $this->cleanupSessionFiles($sessionId);
                
                Log::error('Image failed to save: ' . $fullImagePath);
                return response()->json([
                    'success' => false,
                    'message' => 'Image upload failed',
                    'error_code' => 'IMAGE_NOT_SAVED'
                ], 500);
            }
            
            // Define output path
            $outputFileName = 'output_initial.jpg';
            $outputPath = $sessionPath . DIRECTORY_SEPARATOR . $outputFileName;
            
            // Process with OpenCV using Python script
            $pythonScript = app_path('python' . DIRECTORY_SEPARATOR . 'faceverification' . DIRECTORY_SEPARATOR . 'face_detection.py');
            
            // Ensure we use proper directory separators
            $command = "python \"{$pythonScript}\" \"{$fullImagePath}\" \"{$outputPath}\" 2>&1";
            exec($command, $output, $returnCode);
            
            Log::info('Face detection command executed:', ['command' => $command]); 
            Log::info('Face detection script output:', ['output' => $output]); 
            Log::info('Face detection script return code:', ['return_code' => $returnCode]); 

            if ($returnCode !== 0) {
                // Cleanup on face detection script failure
                $this->cleanupSessionFiles($sessionId);
                
                Log::error('Face detection error:', ['error' => implode("\n", $output)]);
                return response()->json([
                    'success' => false,
                    'message' => 'Face detection processing failed',
                    'error_code' => 'FACE_DETECTION_FAILED'
                ], 500);
            }
            
            // Read the face data JSON
            $faceDataPath = $outputPath . '.json';
            if (!file_exists($faceDataPath)) {
                // Cleanup on missing face data
                $this->cleanupSessionFiles($sessionId);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Face data processing failed',
                    'error_code' => 'FACE_DATA_MISSING'
                ], 500);
            }
            
            $faceData = json_decode(file_get_contents($faceDataPath), true);
            
            // Check if face was detected
            if (empty($faceData['faces'])) {
                // Cleanup when no face is detected
                $this->cleanupSessionFiles($sessionId);
                
                return response()->json([
                    'success' => false,
                    'message' => 'No face detected. Please ensure your face is clearly visible.',
                    'error_code' => 'NO_FACE_DETECTED'
                ], 400);
            }
            
            // Update session in database with face data
            $session->update([
                'initial_face_detected' => true,
                'metadata' => array_merge($session->metadata ?? [], [
                    'face_data' => $faceData,
                    'face_count' => count($faceData['faces'])
                ])
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Face detected successfully',
                'next_challenge' => 'blink',
                'face_count' => count($faceData['faces'])
            ]);
        } catch (\Exception $e) {
            // Catch-all error handling with cleanup
            Log::error('Unexpected error in detectFace: ' . $e->getMessage());
            $this->cleanupSessionFiles($request->input('session_id'));
            
            return response()->json([
                'success' => false,
                'message' => 'Unexpected error during face detection',
                'error_code' => 'UNEXPECTED_ERROR'
            ], 500);
        }
    }
    
    /**
     * Process liveness verification challenge
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function verifyLiveness(Request $request)
    {
        try {
            $request->validate([
                'image' => 'required|image|max:5120', // 5MB max
                'session_id' => 'required|string',
                'challenge_type' => 'required|string|in:blink,turn_head,smile'
            ]);
            
            $sessionId = $request->input('session_id');
            $challengeType = $request->input('challenge_type');
            
            // Find session
            $session = VerificationSession::where('session_id', $sessionId)
                ->where('expires_at', '>', now())
                ->first();
                
            if (!$session) {
                // Cleanup on invalid session
                $this->cleanupSessionFiles($sessionId);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired session',
                    'error_code' => 'INVALID_SESSION'
                ], 400);
            }
            
            // Check if initial face detection was completed
            if (!$session->initial_face_detected) {
                // Cleanup on sequence error
                $this->cleanupSessionFiles($sessionId);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Initial face detection must be completed first',
                    'error_code' => 'SEQUENCE_ERROR'
                ], 400);
            }
            
            // Check prerequisite challenges
            if ($challengeType === 'turn_head' && !$session->challenge_blink_completed) {
                // Cleanup on sequence error
                $this->cleanupSessionFiles($sessionId);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Blink challenge must be completed first',
                    'error_code' => 'SEQUENCE_ERROR'
                ], 400);
            } else if ($challengeType === 'smile' && !$session->challenge_turn_head_completed) {
                // Cleanup on sequence error
                $this->cleanupSessionFiles($sessionId);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Turn head challenge must be completed first',
                    'error_code' => 'SEQUENCE_ERROR'
                ], 400);
            }
            
            // Create directory structure for this session's files
            $sessionDir = 'face_verification' . DIRECTORY_SEPARATOR . $sessionId;
            $challengesDir = $sessionDir . DIRECTORY_SEPARATOR . 'challenges';
            $storageBasePath = storage_path('app');
            $sessionPath = $storageBasePath . DIRECTORY_SEPARATOR . $sessionDir;
            $challengesPath = $storageBasePath . DIRECTORY_SEPARATOR . $challengesDir;
            
            // Create directory if it doesn't exist
            if (!file_exists($challengesPath)) {
                mkdir($challengesPath, 0755, true);
            }
            
            $image = $request->file('image');
            $fileName = $sessionId . '_' . $challengeType . '.' . $image->getClientOriginalExtension();
            $fullImagePath = $challengesPath . DIRECTORY_SEPARATOR . $fileName;
            
            // Store the image using direct file operations
            if (!$image->move($challengesPath, $fileName)) {
                // Cleanup on image save failure
                $this->cleanupSessionFiles($sessionId);
                
                Log::error('Challenge image failed to save: ' . $fullImagePath);
                return response()->json([
                    'success' => false,
                    'message' => 'Image upload failed',
                    'error_code' => 'IMAGE_NOT_SAVED'
                ], 500);
            }
            
            // Define output path
            $outputFileName = 'output_' . $challengeType . '.jpg';
            $outputPath = $challengesPath . DIRECTORY_SEPARATOR . $outputFileName;
            
            // Process with OpenCV using Python script
            $pythonScript = app_path('python' . DIRECTORY_SEPARATOR . 'faceverification' . DIRECTORY_SEPARATOR . 'liveness_' . $challengeType . '.py');
            
            // Ensure we use proper directory separators
            $command = "python \"{$pythonScript}\" \"{$fullImagePath}\" \"{$outputPath}\" 2>&1";
            exec($command, $output, $returnCode);
            
            Log::info('Liveness verification command executed:', ['command' => $command]); 
            Log::info('Liveness verification script output:', ['output' => $output]); 
            Log::info('Liveness verification script return code:', ['return_code' => $returnCode]);
            
            if ($returnCode !== 0) {
                // Cleanup on liveness verification failure
                $this->cleanupSessionFiles($sessionId);
                
                Log::error('Liveness verification error:', ['error' => implode("\n", $output)]);
                return response()->json([
                    'success' => false,
                    'message' => 'Liveness verification failed for ' . $challengeType,
                    'error_code' => 'LIVENESS_CHECK_FAILED'
                ], 400);
            }
            
            // Update session in database
            $session->update([
                'challenge_' . $challengeType . '_completed' => true
            ]);
            
            // Determine the next challenge or complete verification
            $nextChallenge = null;
            $isCompleted = false;
            
            switch ($challengeType) {
                case 'blink':
                    $nextChallenge = 'turn_head';
                    break;
                case 'turn_head':
                    $nextChallenge = 'smile';
                    break;
                case 'smile':
                    // All challenges complete
                    $isCompleted = true;
                    break;
            }
            
            if ($isCompleted) {
                return response()->json([
                    'success' => true,
                    'message' => 'All liveness checks completed successfully',
                    'verification_completed' => true
                ]);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Challenge completed successfully',
                'next_challenge' => $nextChallenge
            ]);
        } catch (\Exception $e) {
            // Catch-all error handling with cleanup
            Log::error('Unexpected error in verifyLiveness: ' . $e->getMessage());
            $this->cleanupSessionFiles($request->input('session_id'));
            
            return response()->json([
                'success' => false,
                'message' => 'Unexpected error during liveness verification',
                'error_code' => 'UNEXPECTED_ERROR'
            ], 500);
        }
    }
    
    /**
     * Complete the verification process and finalize results
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function completeVerification(Request $request)
    {
        $request->validate([
            'session_id' => 'required|string'
        ]);
        
        $sessionId = $request->input('session_id');
        
        // Find session
        $session = VerificationSession::where('session_id', $sessionId)
            ->where('expires_at', '>', now())
            ->first();
            
        if (!$session) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired session',
                'error_code' => 'INVALID_SESSION'
            ], 400);
        }
        
        // Check if all challenges were completed
        if (!$session->allChallengesCompleted()) {
            return response()->json([
                'success' => false,
                'message' => 'Not all verification challenges have been completed',
                'error_code' => 'INCOMPLETE_CHALLENGES'
            ], 400);
        }
        
        // Generate a verification token
        $verificationToken = Str::random(64);
        
        // Update session
        $session->update([
            'verified' => true,
            'verification_token' => $verificationToken,
            'verified_at' => now(),
            'expires_at' => now()->addDay() // Verification valid for 24 hours
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Face verification process completed successfully',
            'verified' => true,
            'verification_token' => $verificationToken,
            'expires_at' => $session->expires_at->toIso8601String()
        ]);
    }
    
    /**
     * Verify a previously issued verification token
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function verifyToken(Request $request)
    {
        $request->validate([
            'verification_token' => 'required|string'
        ]);
        
        $token = $request->input('verification_token');
        
        // Find valid verification session
        $session = VerificationSession::where('verification_token', $token)
            ->valid()
            ->first();
        
        if (!$session) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired verification token',
                'error_code' => 'INVALID_TOKEN'
            ], 400);
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Verification token is valid',
            'user_verified' => true,
            'expires_at' => $session->expires_at->toIso8601String()
        ]);
    }

    /**
     * Clean up all files associated with a verification session
     * 
     * @param string $sessionId
     * @param bool $checkForSuccessToken Whether to check if the session has a valid token before deletion
     * @return bool
     */
    private function cleanupSessionFiles(string $sessionId, bool $checkForSuccessToken = true)
    {
        try {
            // Check if we need to protect successful verifications
            if ($checkForSuccessToken) {
                $session = VerificationSession::where('session_id', $sessionId)
                    ->where('verified', true)
                    ->where('verification_token', '!=', null)
                    ->first();
                
                // If this is a successful verification with a token, don't clean up
                if ($session) {
                    Log::info("Skipping cleanup for successful verification: {$sessionId}");
                    return true;
                }
            }
            
            // Now also clean up the database entry
            $this->cleanupDatabaseEntry($sessionId);
            
            // Define the session directory path
            $sessionDir = storage_path('app' . DIRECTORY_SEPARATOR . 'face_verification' . DIRECTORY_SEPARATOR . $sessionId);
            
            // Check if directory exists
            if (!File::exists($sessionDir)) {
                Log::info("Session directory does not exist: {$sessionDir}");
                return true;
            }
            
            // Attempt to remove the entire session directory
            if (File::deleteDirectory($sessionDir)) {
                Log::info("Successfully cleaned up session files for session: {$sessionId}");
                return true;
            }
            
            Log::error("Failed to clean up session files for session: {$sessionId}");
            return false;
        } catch (\Exception $e) {
            Log::error("Error during session file cleanup: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Clean up database entry for a verification session
     * 
     * @param string $sessionId
     * @return bool
     */
    private function cleanupDatabaseEntry(string $sessionId)
    {
        try {
            // Check if there's a successful verification that shouldn't be deleted
            $session = VerificationSession::where('session_id', $sessionId)
                ->where('verified', true)
                ->where('verification_token', '!=', null)
                ->first();
            
            // If this is a successful verification with a token, don't delete the database entry
            if ($session) {
                Log::info("Skipping database cleanup for successful verification: {$sessionId}");
                return true;
            }
            
            // Delete the session from the database if it's not a successful verification
            $deleted = VerificationSession::where('session_id', $sessionId)->delete();
            
            if ($deleted) {
                Log::info("Successfully deleted database entry for session: {$sessionId}");
                return true;
            } else {
                Log::info("No database entry found for session: {$sessionId}");
                return true;
            }
        } catch (\Exception $e) {
            Log::error("Error during database entry cleanup: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Clean up a failed verification session
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function cleanup(Request $request)
    {
        $request->validate([
            'session_id' => 'required|string'
        ]);
        
        $sessionId = $request->input('session_id');
        
        // Clean up files and database entry without checking for success token
        $this->cleanupSessionFiles($sessionId, false);
        
        return response()->json([
            'success' => true,
            'message' => 'Verification session cleaned up'
        ]);
    }

    
}