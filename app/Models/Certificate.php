<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Certificate extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'certificates';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'owner_id',
        'serial_number',
        'certificate',
        'issuer',
        'status',
    ];

    /**
     * Get the user that owns the certificate.
     */
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Get the revocation information for this certificate.
     */
    public function revocation()
    {
        return $this->hasOne(CertificateRevocationList::class, 'cert_id');
    }
}