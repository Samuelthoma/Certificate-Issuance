<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\App;

class NikVerification extends Model
{
    protected $fillable = ['nik'];
    
    /**
     * Check if a NIK exists in Firebase Database
     * 
     * @param string $nik
     * @return bool
     */
    public static function verifyNik(string $nik): bool
    {
        $database = App::make('firebase.database');
        
        // Access the NIK data in Firebase
        // Assumes you have a structure like "nik_data/{nik}"
        $reference = $database->getReference('DummyData/' . $nik);
        $snapshot = $reference->getSnapshot();
        
        return $snapshot->exists();
    }
}