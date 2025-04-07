<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Document;
use Illuminate\Support\Facades\Auth;

class DocumentController extends Controller
{
    public function upload(Request $request)
    {
        $user = Auth::user();
        $request->validate([
            'file' => 'required|file|max:65536', 
        ]);

        $file = $request->file('file');
        $base64 = base64_encode(file_get_contents($file));

        $doc = Document::create([
            'file_name' => $file->getClientOriginalName(),
            'user_id' => $user->id,
            'file_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'file_data' => $base64,
        ]);

        return response()->json(['documentId' => $doc->id], 201);
    }

    public function get($id)
    {
        $user = Auth::user();
        $doc = Document::where('id', $id)
                    ->where('user_id', $user->id)
                    ->firstorFail();

        if (!$doc) {
            return response()->json(['message' => 'Document not found'], 404);
        }

        return response()->json([
            'file_name' => $doc->file_name,
            'file_type' => $doc->file_type,
            'file_data' => $doc->file_data,
        ]);
    }
}

