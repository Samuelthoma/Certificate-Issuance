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
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use App\Notifications\CollaboratorAdded;
use App\Services\DocumentEncryptionService;


class DocumentController extends Controller
{


    protected $encryptionService;

    public function __construct(DocumentEncryptionService $encryptionService)
    {
        $this->encryptionService = $encryptionService;
    }

    public function upload(Request $request)
    {
        $user = Auth::user();
    
        $request->validate([
            'file' => 'required|file|max:65536|mimes:pdf', 
        ]);
    
        $file = $request->file('file');
        $base64 = base64_encode(file_get_contents($file));
        
        // 1. Generate encryption components and encrypt the document
        $dek = $this->encryptionService->generateDek();
        $iv = $this->encryptionService->generateIv();
        $encryptedData = $this->encryptionService->encryptData($base64, $dek, $iv);
    
        if($encryptedData === false){
            return response()->json(['error' => 'Failed to encrypt file'], 500);
        }
    
        // 2. Fetch the public key from the database
        $certificate = Certificate::where('owner_id', $user->id)
                      ->where('status', 'active')
                      ->first();
        
        if (!$certificate) {
            return response()->json(['error' => 'Certificate not found'], 400);
        }
    
        // 3. Encrypt the DEK with the public key
        $encryptedDek = $this->encryptionService->encryptDekWithCertificate($dek, $certificate->certificate);
    
        if(!$encryptedDek){
            return response()->json(['error' => 'Failed to encrypt DEK'], 500);
        }
    
        // 4. Create document envelope
        $envelope = $this->encryptionService->createEnvelope($encryptedData);
    
        // 5. Store the original document in the database
        $originalDoc = $this->encryptionService->storeDocument(
            $user->id,
            $file->getClientOriginalName(),
            $file->getClientMimeType(),
            $file->getSize(),
            $envelope,
            base64_encode($iv),
            $encryptedDek,
            'original',
            null
        );
    
        // 6. Create duplicate document for logging/archival purposes
        $duplicateDoc = $this->encryptionService->storeDocument(
            $user->id,
            $file->getClientOriginalName(),
            $file->getClientMimeType(),
            $file->getSize(),
            $envelope,
            base64_encode($iv),
            $encryptedDek,
            'duplicate',
            $originalDoc->id
        );
    
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

        if (!$document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        $documentAccess = DocumentAccess::where('document_id', $id)
                            ->where('user_id', $user->id)
                            ->first();
                    
        Log::debug('Document retrieved successfully', ['id' => $id, 'file_name' => $document->file_name]);

        try {
            // Decrypt the document using the encryption service
            // Note: The updated method now base64-encodes the result by default
            $privateKeyRaw = $request->get('private_key');
            $decryptedContent = $this->encryptionService->decryptDocument(
                $document, 
                $documentAccess->encrypted_aes_key, 
                $privateKeyRaw,
                true 
            );
            
            if ($decryptedContent === false) {
                return response()->json(['error' => 'Failed to decrypt document'], 500);
            }
            
            Log::debug('Document decrypted successfully');
            
            // Create a temp directory if it doesn't exist
            $tempPath = storage_path('app/temp');
            if (!File::exists($tempPath)) {
                File::makeDirectory($tempPath, 0755, true);
            }
            
            // Generate a unique filename for the temp file
            $fileExtension = pathinfo($document->file_name, PATHINFO_EXTENSION);
            $fileName = 'temp_' . $document->id . '_' . Str::random(8) . '.' . $fileExtension;
            $filePath = $tempPath . '/' . $fileName;
            
            
            Log::debug('Document saved to temp storage', ['temp_path' => $filePath]);
            
            // Return data with the temp file path
            return response()->json([
                'file_name' => $document->file_name,
                'file_type' => $document->file_type,
                'file_data' => $decryptedContent,  
                'file_owner' => $document->user->email,
                'file_id' => $document->id,
                'isOwner' => $user->id === $document->user_id,
                'status' => $document->status,
                'temp_file_path' => $filePath
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

        $document = Document::with('user')
                    ->findOrFail($id);
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

        $recipient->notify(new CollaboratorAdded($document->file_name, $document->user->email));

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

    public function getCollaboratorDocuments()
    {
        $userId = Auth::id();

        $documents = Document::whereHas('accessList', function ($query) use ($userId) {
                $query->where('user_id', $userId);
            })
            ->where('user_id', '!=', $userId)
            ->get();

        return response()->json(['documents' => $documents]);
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

