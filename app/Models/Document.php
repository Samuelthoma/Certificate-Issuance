<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Document extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'file_name',
        'file_type',
        'file_size',
        'encrypted_file_data',
        'version_type',
        'parent_document_id',
        'iv',
        'status', 
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $model->id = (string) Str::uuid();
        });
    }
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function accessList()
    {
        return $this->hasMany(DocumentAccess::class);
    }
}
