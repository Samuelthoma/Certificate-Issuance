<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\OcrService;
use App\Models\NikVerification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class NikVerificationController extends Controller
{
    protected $ocrService;

    public function showIdForm(){
        return view('auth.id-form');
    }

    public function showOcrForm(){
        return view('auth.ocr-form');
    }

    public function __construct(OcrService $ocrService)
    {
        $this->ocrService = $ocrService;
    }

    public function extractNikFromImage(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id_card' => 'required|file|mimes:jpeg,png,jpg|mimetypes:image/jpeg,image/png|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => 'Invalid image file', 'errors' => $validator->errors()], 422);
        }

        $image = $request->file('id_card');
        $imagePath = $image->store('id_cards');
        $fullImagePath = Storage::path($imagePath);

        if (!file_exists($fullImagePath)) {
            Log::error("Image file not found: {$fullImagePath}");
            return response()->json(['status' => 'error', 'message' => 'Uploaded image could not be processed'], 500);
        }

        try {
            $ktpData = $this->ocrService->extractKtpData($fullImagePath);
            
            $ktpData['nik_accuracy'] = (!empty($ktpData['nik']) && strlen($ktpData['nik']) == 16) ? 'high' : 'low';

            Storage::delete($imagePath);

            return response()->json(['status' => 'success', 'message' => 'KTP data extraction completed', 'data' => $ktpData]);
        } catch (\Exception $e) {
            Log::error("OCR processing error: " . $e->getMessage());
            Storage::delete($imagePath);
            return response()->json(['status' => 'error', 'message' => 'Error processing the image', 'error' => $e->getMessage()], 500);
        }
    }
}
