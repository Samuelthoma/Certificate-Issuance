<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SigningRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_id',
        'requester_id',
        'target_user_id',
        'signature_id',
        'status',
    ];

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function targetUser()
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    public function signature()
    {
        return $this->belongsTo(Signature::class);
    }
}
