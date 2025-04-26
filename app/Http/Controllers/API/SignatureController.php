<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Signature;
use App\Models\SigningRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

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
            $userId = $request->input('user_id');
            $signatures = $request->input('signatures');
            $existingIds = $request->input('existing_ids', []);
            
            // Process each signature
            foreach ($signatures as $signatureData) {
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
                            'content' => $signatureData['content']
                        ]);
                    }
                } else {
                    // Create new signature
                    $signature = Signature::create([
                        'document_id' => $documentId,
                        'page' => $signatureData['page'],
                        'rel_x' => $signatureData['rel_x'],
                        'rel_y' => $signatureData['rel_y'],
                        'rel_width' => $signatureData['rel_width'],
                        'rel_height' => $signatureData['rel_height'],
                        'type' => $signatureData['type'],
                        'content' => $signatureData['content']
                    ]);
                    
                    // Create or update signing request if this is for another user
                    if (!empty($signatureData['user_id']) && $signatureData['user_id'] != $userId) {
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
            
            // Delete signatures that no longer exist
            if (!empty($existingIds)) {
                Signature::where('document_id', $documentId)
                    ->whereNotIn('id', $existingIds)
                    ->delete();
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
}