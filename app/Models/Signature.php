<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Signature extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_id',
        'page',
        'rel_x',
        'rel_y',
        'rel_width',
        'rel_height',
        'type',
        'content',
    ];

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function signingRequests()
    {
        return $this->hasMany(SigningRequest::class);
    }

    public function isTyped(): bool
    {
        return $this->type === 'typed';
    }

    public function isDrawn(): bool
    {
        return $this->type === 'drawn';
    }
}
