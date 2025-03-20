<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class OcrService
{
    protected $pythonApiUrl;
    protected $client;

    public function __construct()
    {
        $this->pythonApiUrl = env('PYTHON_OCR_URL', 'http://127.0.0.1:5000/extract_ktp');
        $this->client = new Client();
    }

    public function extractKtpData($imagePath)
    {
        Log::info("Inside OcrService: Processing $imagePath");

        try {
            $response = $this->client->post($this->pythonApiUrl, [
                'multipart' => [
                    [
                        'name'     => 'image',
                        'contents' => fopen($imagePath, 'r'),
                        'filename' => basename($imagePath)
                    ]
                ],
                'timeout' => 30 // Set a reasonable timeout
            ]);

            // Decode JSON response
            $body = json_decode($response->getBody(), true);
            
            // Log the exact response from Python
            Log::info("Python OCR Response:", ['body' => $body]);

            return $body;
        } catch (GuzzleException $e) {
            Log::error("Error calling Python OCR: " . $e->getMessage());
            throw new \Exception("OCR service unavailable: " . $e->getMessage());
        } catch (\Exception $e) {
            Log::error("Unexpected error: " . $e->getMessage());
            throw new \Exception("OCR processing error: " . $e->getMessage());
        }
    }
}