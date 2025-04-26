<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SignedDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_id',
        'signer_id',
        'certificate_id',
        'signed_file_data',
        'signed_at',
    ];

    public $timestamps = false; // signed_at is manually handled

    protected $casts = [
        'signed_at' => 'datetime',
    ];

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function signer()
    {
        return $this->belongsTo(User::class, 'signer_id');
    }

    public function certificate()
    {
        return $this->belongsTo(Certificate::class, 'certificate_id', 'cert_id');
    }
}
