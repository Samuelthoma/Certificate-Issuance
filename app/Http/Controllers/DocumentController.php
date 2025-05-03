<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Document;
use App\Models\Certificate;
use App\Models\UserKey;
use App\Models\DocumentAccess;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;


class DocumentController extends Controller
{
    public function upload(Request $request)
    {
        $user = Auth::user();
    
        $request->validate([
            'file' => 'required|file|max:65536|mimes:pdf', 
        ]);
    
        $file = $request->file('file');
        $base64 = base64_encode(file_get_contents($file));
        
        // 1. Generate AES-256 DEK
        $dek = random_bytes(32);
        Log::debug('DEK Generated : ' . $dek . ' length: ' . strlen($dek)); // Must be 32 bytes
    
        // 2. Encrypt the document content with the DEK using AES-256-CBC
        $iv = random_bytes(16);
        Log::debug('IV Generated : ' . $iv . ' length: ' . strlen($iv)); // Must be 16 bytes
        $encryptedData = openssl_encrypt($base64, 'aes-256-cbc', $dek, OPENSSL_RAW_DATA, $iv);
    
        if($encryptedData === false){
            return response()->json(['error' => 'Failed to encrypt file'], 500);
        }
    
        // 3. Fetch the public key from the database
        $certificate = Certificate::where('owner_id', $user->id)
                       ->where('status', 'active')
                       ->first();
        
        if (!$certificate) {
            return response()->json(['error' => 'Certificate not found'], 400);
        }
    
        // 4. Encrypt the DEK with the public key using RSA
        $certResource = openssl_x509_read($certificate->certificate);
        
        if (!$certResource) {
            return response()->json(['error' => 'Invalid public key'], 500);
        }
    
        $publicKey = openssl_get_publickey($certResource);
        if (!$publicKey) {
            return response()->json(['error' => 'Failed to get public key'], 500);
        }
    
        $encryptedDek = null;
        $encryptSuccess = openssl_public_encrypt($dek, $encryptedDek, $publicKey);
    
        if(!$encryptSuccess){
            return response()->json(['error' => 'Failed to encrypt DEK'], 500);
        }
    
        openssl_free_key($publicKey);
    
        $encryptred_dek = base64_encode($encryptedDek);
    
        $envelope = base64_encode(json_encode([
            'encrypted_data' => base64_encode($encryptedData)
        ]));
    
        // 5. Store the original document in the database
        $originalDocumentId = (string) Str::uuid();
        $originalDoc = Document::create([
            'id' => $originalDocumentId,
            'user_id' => $user->id,
            'file_name' => $file->getClientOriginalName(),
            'file_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'encrypted_file_data' => $envelope,
            'version_type' => 'original',
            'parent_document_id' => null,
            'iv' => base64_encode($iv),
        ]);
    
        DocumentAccess::create([
            'document_id' => $originalDoc->id,
            'user_id' => $originalDoc->user_id,
            'encrypted_aes_key' => $encryptred_dek,
        ]);
    
        // 6. Create duplicate document for logging/archival purposes
        $duplicateDocumentId = (string) Str::uuid();
        $duplicateDoc = Document::create([
            'id' => $duplicateDocumentId,
            'user_id' => $user->id,
            'file_name' => $file->getClientOriginalName(),
            'file_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'encrypted_file_data' => $envelope,
            'version_type' => 'duplicate',
            'parent_document_id' => $originalDoc->id, // Reference to original document
            'iv' => base64_encode($iv),
        ]);
    
        // Create access record for the duplicate document
        DocumentAccess::create([
            'document_id' => $duplicateDoc->id,
            'user_id' => $duplicateDoc->user_id,
            'encrypted_aes_key' => $encryptred_dek,
        ]);
    
        // Return the duplicate document ID instead of the original
        return response()->json([
            'documentId' => $duplicateDoc->id,
            'originalDocumentId' => $originalDoc->id
        ], 201);
    }

    
    public function get(Request $request, $id)
    {
        Log::debug('Raw content', ['raw' => $request->getContent()]);

        $user = Auth::user();
        $document = Document::with('user')
                    ->where('id', $id)
                    ->whereHas('accessList', function ($query) use ($user) {
                        $query->where('user_id', $user->id);
                    })
                    ->first();

        $documentAccess = DocumentAccess::where('document_id', $id)
                            ->where('user_id', $user->id)
                            ->first();
                    
        Log::debug('Document retrieved successfully', ['id' => $id, 'file_name' => $document->file_name]);

        try {
            // 1. Decode the envelope
            $envelopeJson = base64_decode($document->encrypted_file_data);
            $envelope = json_decode($envelopeJson, true);
            
            if(!$envelope){
                Log::error('Invalid envelope format', ['id' => $id]);
                return response()->json(['error' => 'Invalid envelope format'], 400);
            }
            
            Log::debug('Envelope decoded successfully');

            $iv = base64_decode($document->iv);
            Log::debug('IV length: ' . strlen($iv)); // Must be 16 bytes
            $encryptedData = base64_decode($envelope['encrypted_data']);

            $encryptedDek = base64_decode($documentAccess->encrypted_aes_key);

            // 2. Decrypt the DEK
            $privateKeyRaw = $request->get('private_key');
            $privateKeyPem = str_replace("\\n", "\n", $privateKeyRaw);
            Log::debug('Private key retrieved from session' . $privateKeyPem);
            $privateKey = openssl_pkey_get_private($privateKeyPem);

            $dek = null;
            $decryptSuccess = openssl_private_decrypt($encryptedDek, $dek, $privateKey);
            Log::debug('DEK length after decrypt: ' . strlen($dek)); // Must be 32
            openssl_free_key($privateKey);

            if (!$decryptSuccess) {
                Log::error('Failed to decrypt DEK');
                return response()->json(['error' => 'Failed to decrypt DEK'], 500);
            }
            
            Log::debug('DEK decrypted successfully');
            Log::debug('DEK length: ' . strlen($dek));
            Log::debug('DEK : ' . $dek);
            Log::debug('IV : ' . $iv . 'Length : ' . strlen($iv));
            // 4. Decrypt the document content with the DEK
            $decryptedContent = openssl_decrypt($encryptedData, 'aes-256-cbc', $dek, OPENSSL_RAW_DATA, $iv);
            
            
            if ($decryptedContent === false) {
                Log::error('Failed to decrypt document content');
                return response()->json(['error' => 'Failed to decrypt document'], 500);
            }
            
            Log::debug('Document decrypted successfully');
            
            // The decryptedContent is already base64 encoded from your upload function
            
            // 5. Return data
            return response()->json([
                'file_name' => $document->file_name,
                'file_type' => $document->file_type,
                'file_data' => $decryptedContent,
                'file_owner' => $document->user->email,
                'file_id' => $document->id,
                'isOwner' => $user->id === $document->user_id,
                'status' => $document->status // Add the status field to the response
            ]);
        } catch (\Exception $e) {
            Log::error('Exception in document decryption', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Internal server error: ' . $e->getMessage()], 500);
        }
    }

    public function index()
    {
        $user = Auth::user();
        $documents = Document::where('user_id', $user->id)
                     ->where('version_type', 'duplicate')
                     ->orderBy('created_at', 'desc')
                     ->get();

        return response()->json($documents);
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $document = Document::where('id', $id)->where('user_id', $user->id)->first();

        if (!$document) {
            return response()->json(['message' => 'Document not found or unauthorized.'], 404);
        }

        try {
            $document->delete();
            return response()->json(['message' => 'Document deleted successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete document.'], 500);
        }
    }

    public function addCollaborator(Request $request, $id)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = Auth::user();

        $document = Document::findOrFail($id);
        if($user->id !== $document->user_id){
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        $recipient = User::where('email', $request->email)->first();
        if (!$recipient) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if (DocumentAccess::where('document_id', $document->id)->where('user_id', $recipient->id)->exists()) {
            return response()->json(['message' => 'User already has access'], 409);
        }

        // Decrypt Owner's DEK
        $documentAccess = DocumentAccess::where('document_id', $id)
                            ->where('user_id', $user->id)
                            ->first();

        $encryptedDek = base64_decode($documentAccess->encrypted_aes_key);
        Log::debug($encryptedDek);

        $privateKeyRaw = $request->get('private_key');
        Log::debug('Private key retrieved from session' . $privateKeyRaw);
        $privateKeyPem = str_replace("\\n", "\n", $privateKeyRaw);
        $privateKey = openssl_pkey_get_private($privateKeyPem);
        $dek = null;

        $decryptedDek = openssl_private_decrypt($encryptedDek, $dek, $privateKey);
        Log::debug('DEK length after decrypt: ' . strlen($dek) . $dek); 
        openssl_free_key($privateKey);

        if (!$decryptedDek) {
            Log::error('Failed to decrypt DEK');
                return response()->json(['error' => 'Failed to decrypt DEK'], 500);
            }
        Log::debug('DEK decrypted successfully');
        // End Decrypt Owner's DEK

        // Encrypt DEK with recipient's public key
        $recipientCertificate = Certificate::where('owner_id', $recipient->id)
                            ->where('status', 'active')
                            ->first();

        $certResource = openssl_x509_read($recipientCertificate->certificate);
        $publicKey = openssl_get_publickey($certResource);

        $encryptedDekForRecipient = null;

        openssl_public_encrypt($dek, $encryptedDekForRecipient, $publicKey);
        openssl_free_key($publicKey);

        $encryptred_dek = base64_encode($encryptedDekForRecipient);
        DocumentAccess::create([
            'document_id' => $document->id,
            'user_id' => $recipient->id,
            'encrypted_aes_key' => $encryptred_dek,
        ]);
        return response()->json(['message' => 'Collaborator added successfully']);
        // End Encrypt DEK with recipient's public key
    }

    public function getCollaborators($documentId){
        $user = Auth::user();

        $document = Document::with('user')
                    ->where('id', $documentId)
                    ->whereHas('accessList', function ($query) use ($user) {
                        $query->where('user_id', $user->id);
                    })
                    ->firstOrFail();

        $collaborators = DocumentAccess::with('user')
            ->where('document_id', $documentId)
            ->where('user_id', '!=', $document->user_id)
            ->get()
            ->pluck('user');

        return response()->json(['collaborators' => $collaborators->values()]);
    }

    public function sendDocument($id){
        $user = Auth::user();
        $document = Document::where('id', $id)->where('user_id', $user->id)->first();

        if (!$document) {
            return response()->json(['message' => 'Document not found or unauthorized.'], 404);
        }

        try {
            $document->status = 'pending';
            $document->save();

            return response()->json(['message' => 'Document sent successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to send document.'], 500);
        }
    }

    public function removeCollaborator($id, $userId)
    {
        $user = Auth::user();
        $document = Document::findOrFail($id);
        if($user->id !== $document->user_id){
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $documentAccess = DocumentAccess::where('document_id', $id)->where('user_id', $userId)->first();

        if (!$documentAccess) {
            return response()->json(['message' => 'Document not found or unauthorized.'], 404);
        }

        try {
            $documentAccess->delete();
            return response()->json(['message' => 'Collaborator removed successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete collaborator.'], 500);
        }
    }
}

