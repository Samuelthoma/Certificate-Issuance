<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class SignatureNonce extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'signature_nonces';

    protected $fillable = [
        'id',
        'nonce',
        'user_id',
        'document_id',
        'hash',
        'expires_at',
        'used',
        'signed_at',
        'status',
        'ip_address',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $model->id ??= Str::uuid();
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}

