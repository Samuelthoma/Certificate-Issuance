<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Signature;
use App\Models\SigningRequest;
use App\Models\SignatureNonce;
use App\Models\Certificate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class SignatureController extends Controller
{
    /**
     * Save signature draft data
     * Includes security checks for document status, ownership, and content integrity
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function saveDraft(Request $request)
    {
        // Validate incoming request data
        $validator = Validator::make($request->all(), [
            'document_id' => 'required|exists:documents,id',
            'user_id' => 'required|exists:users,id',
            'signatures' => 'required|array',
            'signatures.*.page' => 'required|integer|min:1',
            'signatures.*.rel_x' => 'required|numeric',
            'signatures.*.rel_y' => 'required|numeric',
            'signatures.*.rel_width' => 'required|numeric',
            'signatures.*.rel_height' => 'required|numeric',
            'signatures.*.type' => 'required|in:typed,drawn',
            'signatures.*.status' => 'required|in:pending,active',
            'signatures.*.user_id' => 'required|exists:users,id',
            'existing_ids' => 'array'
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
            $userId = $request->input('user_id');
            
            // Get the authenticated user ID
            $authenticatedUserId = Auth::user()->id;
            
            // Verify the authenticated user matches the requested user_id
            if ($authenticatedUserId != $userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access attempt detected'
                ], 403);
            }
            
            // Fetch the document with status check
            $document = Document::find($documentId);
            
            // Check if document exists
            if (!$document) {
                return response()->json([
                    'success' => false,
                    'message' => 'Document not found'
                ], 404);
            }
            
            // Check document ownership
            if ($document->user_id != $authenticatedUserId) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to modify this document'
                ], 403);
            }
            
            // Check document status
            if ($document->status !== 'draft') {
                return response()->json([
                    'success' => false,
                    'message' => "This document is no longer in draft status. Current status: {$document->status}"
                ], 403);
            }
            
            DB::beginTransaction();
            
            $signatures = $request->input('signatures');
            $existingIds = $request->input('existing_ids', []);
            
            // Get existing signatures for content preservation check
            $existingSignatures = Signature::where('document_id', $documentId)
                ->whereIn('id', array_filter(array_column($signatures, 'id')))
                ->get()
                ->keyBy('id');
            
            // Process each signature
            foreach ($signatures as $signatureData) {
                // Check if this is an update (has ID) or create (no ID)
                if (!empty($signatureData['id'])) {
                    // Update existing signature
                    $signature = Signature::find($signatureData['id']);
                    
                    if ($signature) {
                        // Security check: Preserve original content
                        $content = $signature->content;
                        
                        // Check for potential content tampering
                        if (isset($signatureData['content']) && $signatureData['content'] !== $content) {
                            DB::rollBack();
                            return response()->json([
                                'success' => false,
                                'message' => 'Content modification detected - operation aborted'
                            ], 403);
                        }
                        
                        // Ensure status is 'pending' during draft updates
                        if ($signatureData['status'] !== 'pending') {
                            $signatureData['status'] = 'pending';
                        }
                        
                        $signature->update([
                            'page' => $signatureData['page'],
                            'rel_x' => $signatureData['rel_x'],
                            'rel_y' => $signatureData['rel_y'],
                            'rel_width' => $signatureData['rel_width'],
                            'rel_height' => $signatureData['rel_height'],
                            'type' => $signatureData['type'],
                            'status' => $signatureData['status'],
                            'user_id' => $signatureData['user_id'],
                            // Content is preserved from original
                            'content' => $content
                        ]);
                    }
                } else {
                    // Create new signature
                    // For new signatures, content should be empty in draft mode
                    $signature = Signature::create([
                        'document_id' => $documentId,
                        'user_id' => $signatureData['user_id'],
                        'page' => $signatureData['page'],
                        'rel_x' => $signatureData['rel_x'],
                        'rel_y' => $signatureData['rel_y'],
                        'rel_width' => $signatureData['rel_width'],
                        'rel_height' => $signatureData['rel_height'],
                        'type' => $signatureData['type'],
                        'content' => '', // Always empty for new signatures in draft
                        'status' => 'pending' // Always pending in draft
                    ]);
                    
                    $existingIds[] = $signature->id; 

                    // Create or update signing request if this is for another user
                    if ($signatureData['user_id'] != $userId) {
                        SigningRequest::updateOrCreate(
                            [
                                'document_id' => $documentId,
                                'signature_id' => $signature->id,
                                'target_user_id' => $signatureData['user_id']
                            ],
                            [
                                'requester_id' => $userId,
                                'status' => 'pending'
                            ]
                        );
                    }
                }
            }
            
            // Delete signatures that no longer exist (only if user is document owner)
            if (!empty($existingIds)) {
                // Get all signature IDs for this document
                $allDocSignatureIds = Signature::where('document_id', $documentId)->pluck('id')->toArray();
                
                // Find IDs that should be deleted (in document but not in existingIds)
                $idsToDelete = array_diff($allDocSignatureIds, $existingIds);
                
                if (!empty($idsToDelete)) {
                    Signature::whereIn('id', $idsToDelete)->delete();
                }
            }
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Document draft saved successfully'
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while saving the draft',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get signatures for a specific document
     * 
     * @param int $documentId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getSignatures($documentId)
    {
        // Make sure the document exists
        $document = Document::find($documentId);
        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Document not found'
            ], 404);
        }
        
        // Get all signatures for this document
        $signatures = Signature::where('document_id', $documentId)->get();
        
        // Transform signatures to include necessary information
        $signatureData = $signatures->map(function ($signature) {
            return [
                'id' => $signature->id,
                'document_id' => $signature->document_id,
                'user_id' => $signature->user_id,
                'page' => $signature->page,
                'rel_x' => $signature->rel_x,
                'rel_y' => $signature->rel_y,
                'rel_width' => $signature->rel_width,
                'rel_height' => $signature->rel_height,
                'type' => $signature->type,
                'status' => $signature->status,
                'content' => $signature->content,
            ];
        });
        
        return response()->json([
            'success' => true,
            'signatures' => $signatureData
        ]);
    }
}