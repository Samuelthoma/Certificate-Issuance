<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;
use App\Models\Document;

class DocumentAccess extends Model
{
    protected $table = 'document_access';

    protected $fillable = [
        'document_id',
        'user_id',
        'encrypted_aes_key',
    ];

    public $timestamps = false;

    /**
     * Get the user associated with this access.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the document associated with this access.
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}
