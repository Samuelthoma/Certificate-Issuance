<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Log;

class NikVerification extends Model
{
    protected $fillable = ['nik'];
    
    /**
     * Check if a NIK exists in Firebase Database
     * 
     * @param string $nik
     * @return bool
     */
    public static function verifyNik(string $nik, string $name, string $dob): bool
    {
        $database = App::make('firebase.database');
        
        Log::info("Attempting to verify NIK: $nik");
        
        // Use the direct path to the NIK without any prefix
        // Since your NIKs are directly at the root level
        $reference = $database->getReference('DummyData/' . $nik);
        $snapshot = $reference->getSnapshot();
        
        if (!$snapshot->exists()) {
            Log::info("NIK [$nik] not found in Firebase.");
            return false;
        }
        
        $data = $snapshot->getValue();
        Log::info("Firebase data for [$nik]: " . json_encode($data));
        
        $nameMatches = strtolower(trim($data['Name'] ?? '')) === strtolower(trim($name));
        $dobMatches = ($data['DoB'] ?? '') === $dob;
        
        Log::info("Name match: " . ($nameMatches ? 'yes' : 'no'));
        Log::info("DOB match: " . ($dobMatches ? 'yes' : 'no'));
        
        return $nameMatches && $dobMatches;
    }
}