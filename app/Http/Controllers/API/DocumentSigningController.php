<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Signature;
use App\Models\SignatureNonce;
use App\Models\Certificate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;

class DocumentSigningController extends Controller
{
    /**
     * Initiate the document signing process
     * Creates a nonce and prepares the document for signing
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function initiateSigningProcess(Request $request)
    {
        // Validate incoming request data
        $validator = Validator::make($request->all(), [
            'document_id' => 'required|exists:documents,id',
            'signature_boxes' => 'required|array',
            'signature_boxes.*.box_id' => 'required|string',
            'signature_boxes.*.db_id' => 'required|exists:signatures,id',
            'signature_boxes.*.page' => 'required|integer|min:1',
            'signature_boxes.*.content' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $documentId = $request->input('document_id');
            $userId = Auth::user()->id;
            
            // Fetch the document
            $document = Document::find($documentId);
            
            // Check if document exists
            if (!$document) {
                return response()->json([
                    'success' => false,
                    'message' => 'Document not found'
                ], 404);
            }
            
            // Check if user has permission to sign this document
            $hasPermission = false;
            
            // Check if user is the document owner
            if ($document->user_id == $userId) {
                $hasPermission = true;
            } 
            // Check if user has access to the document
            else {
                $hasAccess = $document->accessList()
                    ->where('user_id', $userId)
                    ->where('permission', 'sign')
                    ->exists();
                    
                if ($hasAccess) {
                    $hasPermission = true;
                }
            }
            
            if (!$hasPermission) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to sign this document'
                ], 403);
            }
            
            // Verify all signature boxes belong to the authenticated user
            $signatureBoxes = $request->input('signature_boxes');
            $dbIds = array_column($signatureBoxes, 'db_id');
            
            $signatures = Signature::whereIn('id', $dbIds)
                ->where('document_id', $documentId)
                ->get();
                
            // Check if all signature boxes exist
            if ($signatures->count() != count($dbIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'One or more signature boxes not found'
                ], 404);
            }
            
            // Check if all signature boxes belong to the user
            foreach ($signatures as $signature) {
                if ($signature->user_id != $userId) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You can only sign your own signature boxes'
                    ], 403);
                }
            }
            
            // Get user's certificate
            $certificate = Certificate::where('owner_id', $userId)
                ->where('status', 'active')
                ->first();
                
            if (!$certificate) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active certificate found for your account'
                ], 404);
            }
            
            // Create a nonce for this signing session
            $nonce = Str::random(32);
            $expiresAt = now()->addMinutes(30);
            
            // Calculate hash of the document
            $documentHash = hash('sha256', $document->id . $nonce . json_encode($signatureBoxes));
            
            // Store the nonce
            $nonceEntry = SignatureNonce::create([
                'nonce' => $nonce,
                'user_id' => $userId,
                'document_id' => $documentId,
                'hash' => $documentHash,
                'expires_at' => $expiresAt,
                'used' => false,
                'ip_address' => $request->ip(),
                'status' => 'pending'
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Signing process initiated',
                'nonce' => $nonce,
                'document_hash' => $documentHash,
                'expires_at' => $expiresAt
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error initiating signing process: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while initiating the signing process',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Complete the document signing process
     * Applies the signature to the document
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function completeSigningProcess(Request $request)
    {
        // Validate incoming request data
        $validator = Validator::make($request->all(), [
            'document_id' => 'required|exists:documents,id',
            'nonce' => 'required|string',
            'signature' => 'required|string',
            'signature_boxes' => 'required|array',
            'signature_boxes.*.db_id' => 'required|exists:signatures,id',
            'signature_boxes.*.content' => 'required|string',
            'document_data' => 'required|string',
            'private_key' => 'required|string'  // Add private key validation
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();
            
            $documentId = $request->input('document_id');
            $nonce = $request->input('nonce');
            $signature = $request->input('signature');
            $signatureBoxes = $request->input('signature_boxes');
            $privateKey = $request->input('private_key');  // Get private key from request
            $userId = Auth::user()->id;
    
                // Verify the nonce
                $nonceEntry = SignatureNonce::where('nonce', $nonce)
                ->where('document_id', $documentId)
                ->where('user_id', $userId)
                ->where('used', false)
                ->where('status', 'pending')
                ->where('expires_at', '>', now())
                ->first();
                
            if (!$nonceEntry) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired nonce'
                ], 400);
            }
            
            // Fetch the document
            $document = Document::find($documentId);
            
            // Check if document exists
            if (!$document) {
                return response()->json([
                    'success' => false,
                    'message' => 'Document not found'
                ], 404);
            }
            
            // Get user's certificate
            $certificate = Certificate::where('owner_id', $userId)
                ->where('status', 'active')
                ->first();
                
            if (!$certificate) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active certificate found for your account'
                ], 404);
            }
            
            // Ensure we have the base64 data of the document from the request
            // The client already has the decrypted version of the document
            $base64DocumentData = $request->input('document_data');
            
            if (!$base64DocumentData) {
                return response()->json([
                    'success' => false,
                    'message' => 'Document data is missing'
                ], 400);
            }
            
            // Save to temp file for processing
            $tempFilePath = storage_path('app\\temp\\' . uniqid() . '.pdf');
            
            // Convert base64 to binary
            $binaryData = base64_decode($base64DocumentData);
            if (!$binaryData) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid document data'
                ], 400);
            }
            
            file_put_contents($tempFilePath, $binaryData);
            
            // When calling applySignature, pass the private key
            $signedFilePath = $this->applySignature(
                $tempFilePath, 
                $certificate, 
                $signatureBoxes, 
                $signature,
                $privateKey  // Pass private key to the method
            );
            
            // Rest of the method remains the same...
        }
        catch (\Exception $e) {
            // Exception handling remains the same...
        }
    }
    
    /**
     * Encrypt the document using AES
     * 
     * @param string $data
     * @param string $iv
     * @return string
     */
    private function encryptDocument($data, $iv)
    {
        // Get the encryption key
        $key = env('APP_KEY');
        
        // Encrypt the data
        $encryptedData = openssl_encrypt(
            $data,
            'aes-256-cbc',
            $key,
            0,
            $iv
        );
        
        return $encryptedData;
    }
    
    /**
     * Apply signature to PDF using pyhanko
     * 
     * @param string $filePath - Path to the PDF file
     * @param Certificate $certificate - User's certificate
     * @param array $signatureBoxes - Array of signature box data
     * @param string $signature - Digital signature
     * @param string $privateKey - User's private key for signing
     * @return string|null - Path to the signed PDF or null on failure
     */
    private function applySignature($filePath, $certificate, $signatureBoxes, $signature, $privateKey = null)
    {
        try {
            // Create a unique identifier for this operation
            $operationId = uniqid();
            
            // Create a temporary directory for this operation
            $tempDir = storage_path('app\\temp\\' . $operationId);
            if (!file_exists($tempDir)) {
                mkdir($tempDir, 0777, true);
            }
            
            // Copy the PDF to the temp directory
            $tempPdfPath = $tempDir . '\\document.pdf';
            copy($filePath, $tempPdfPath);
            
            // Create a temporary file for the certificate
            $certPath = $tempDir . '\\certificate.pem';
            file_put_contents($certPath, $certificate->certificate);
            
            // Create a temporary file for the private key if provided
            $keyPath = null;
            if ($privateKey) {
                $keyPath = $tempDir . '\\private_key.pem';
                file_put_contents($keyPath, $privateKey);
            }
            
            // Create a temporary file for the signature
            $signaturePath = $tempDir . '\\signature.dat';
            file_put_contents($signaturePath, base64_decode($signature));
            
            // Create a JSON file with the signature boxes
            $boxesJson = json_encode($signatureBoxes);
            $boxesJsonPath = $tempDir . '\\boxes.json';
            file_put_contents($boxesJsonPath, $boxesJson);
            
            // Create output path
            $outputPath = $tempDir . '\\signed.pdf';
            
            // Path to the Python script (already existing in the project)
            $pythonScript = base_path('app\\Python\\documentsigning\\apply_signature.py');
        
            // Ensure the Python script directory exists
            $scriptDir = dirname($pythonScript);
            if (!file_exists($scriptDir)) {
                mkdir($scriptDir, 0777, true);
            }
            
            // Build the command
            $command = [
                'python',
                $pythonScript,
                $tempPdfPath,
                $certPath,
                $signaturePath,
                $boxesJsonPath,
                $outputPath
            ];
            
            // Add the private key path if available
            if ($keyPath) {
                $command[] = $keyPath;
            }
            
            Log::debug($command);
            // Run the command
            $process = new Process($command);
            $process->setTimeout(180); // 3 minutes
            $process->run();
            
            // Check if the process was successful
            if (!$process->isSuccessful()) {
                Log::error('Python script failed: ' . $process->getErrorOutput());
                throw new ProcessFailedException($process);
            }
            
            // Check if the output file exists
            if (!file_exists($outputPath)) {
                Log::error('Output file not created');
                return null;
            }
            
            // Return the path to the signed PDF
            return $outputPath;
        } catch (\Exception $e) {
            Log::error('Error applying signature: ' . $e->getMessage());
            return null;
        }
    }
}