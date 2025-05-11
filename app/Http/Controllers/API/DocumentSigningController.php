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
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use App\Services\DocumentEncryptionService;

class DocumentSigningController extends Controller
{
    protected $encryptionService;

    /**
     * Constructor
     *
     * @param DocumentEncryptionService $encryptionService
     */
    public function __construct(DocumentEncryptionService $encryptionService)
    {
        $this->encryptionService = $encryptionService;
    }

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
            // Check if user has signature fields assigned to them in this document
            else {
                $hasSignatureField = Signature::where('document_id', $documentId)
                    ->where('user_id', $userId)
                    ->exists();
                    
                if ($hasSignatureField) {
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
            
            // Create a nonce for this signing process
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
            'private_key' => 'required|string'
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
            $privateKey = $request->input('private_key');
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
            
            // Call the signing API
            $signedFilePath = $this->applySignature(
                $tempFilePath, 
                $certificate, 
                $signatureBoxes, 
                $signature,
                $privateKey  
            );
            
            if (!$signedFilePath) {
                // Clean up temp file
                @unlink($tempFilePath);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to apply signature to document'
                ], 500);
            }
            
            // Read the signed document
            $signedDocument = file_get_contents($signedFilePath);
            
            // Clean up temp files
            @unlink($tempFilePath);
            @unlink($signedFilePath);
            Log::debug('Signed document binary size: ' . strlen($signedDocument));

            $encryptedSignedDocument = $this->encryptionService->reEncryptWithExistingKeys(
                $signedDocument, 
                $document, 
                $privateKey
            );

            if ($encryptedSignedDocument === false) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to encrypt signed document'
                ], 500);
            }
            
            // Update the document with the signed version
            $this->encryptionService->updateDocument($document, $encryptedSignedDocument);
            
            // Update signature status
            $dbIds = array_column($signatureBoxes, 'db_id');
            Signature::whereIn('id', $dbIds)->update([
                'status' => 'active'
            ]);
            
            // Mark nonce as used
            $nonceEntry->update([
                'used' => true,
                'signed_at' => now(),
                'status' => 'used'
            ]);
            
            // Update signature boxes with content
            foreach ($signatureBoxes as $boxData) {
                $signature = Signature::find($boxData['db_id']);
                if ($signature) {
                    $signature->update([
                        'content' => $boxData['content']
                    ]);
                }
            }
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Document signed successfully',
                'redirect_url' => '/dashboard'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error completing signing process: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while completing the signing process',
                'error' => $e->getMessage()
            ], 500);
        }
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
            
            // Prepare the POST request to Flask API
            $response = Http::attach(
                'document', file_get_contents($tempPdfPath), 'document.pdf'
            )->attach(
                'certificate', file_get_contents($certPath), 'certificate.pem'
            )->attach(
                'signature_data', file_get_contents($signaturePath), 'signature.dat'
            )->attach(
                'signature_box', file_get_contents($boxesJsonPath), 'boxes.json'
            )->attach(
                'private_key', file_get_contents($keyPath), 'private_key.pem'
            )->post('http://127.0.0.1:5001/sign');

            // Check if the response is OK
            if (!$response->ok()) {
                Log::error('Flask signer API error: ' . $response->body());
                return null;
            }

            // Save the signed PDF returned by the Flask API
            file_put_contents($outputPath, $response->body());
            if (file_put_contents($outputPath, $response->body()) === false) {
                Log::error('Failed to save the signed PDF to ' . $outputPath);
            }

            // Return the path to the signed PDF
            return $outputPath;
        } catch (\Exception $e) {
            Log::error('Error applying signature: ' . $e->getMessage());
            return null;
        }
    }
}