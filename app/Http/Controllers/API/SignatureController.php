<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Signature;
use App\Models\SigningRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class SignatureController extends Controller
{
    /**
     * Save signature draft data
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
            DB::beginTransaction();
            
            $documentId = $request->input('document_id');
            $userId = auth()->user();
            $signatures = $request->input('signatures');
            $existingIds = $request->input('existing_ids', []);
            
            // Check document ownership
            $document = Document::find($documentId);
            $isDocumentOwner = $document && $document->user_id == $userId;
            
            // Process each signature
            foreach ($signatures as $signatureData) {
                // Ensure content is set, even if empty
                $content = $signatureData['content'] ?? '';
                
                // Check if this is an update (has ID) or create (no ID)
                if (!empty($signatureData['id'])) {
                    // Update existing signature
                    $signature = Signature::find($signatureData['id']);
                    
                    if ($signature) {
                        $signature->update([
                            'page' => $signatureData['page'],
                            'rel_x' => $signatureData['rel_x'],
                            'rel_y' => $signatureData['rel_y'],
                            'rel_width' => $signatureData['rel_width'],
                            'rel_height' => $signatureData['rel_height'],
                            'type' => $signatureData['type'],
                            'content' => $content,
                            'status' => $signatureData['status'],
                            'user_id' => $signatureData['user_id']
                        ]);
                    }
                } else {
                    // Create new signature
                    $signature = Signature::create([
                        'document_id' => $documentId,
                        'user_id' => $signatureData['user_id'],
                        'page' => $signatureData['page'],
                        'rel_x' => $signatureData['rel_x'],
                        'rel_y' => $signatureData['rel_y'],
                        'rel_width' => $signatureData['rel_width'],
                        'rel_height' => $signatureData['rel_height'],
                        'type' => $signatureData['type'],
                        'content' => $content,
                        'status' => $signatureData['status']
                    ]);
                    
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
            if ($isDocumentOwner && !empty($existingIds)) {
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