<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CertificateRevocationList extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'certificate_revocation_list';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'revocation_id';

    /**
     * Indicates if the model should be timestamped.
     * (Only one timestamp field exists, so we disable default Laravel timestamps)
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'cert_id',
        'serial_number',
        'reason',
        'revoked_at',
    ];

    /**
     * Get the certificate that is revoked.
     */
    public function certificate()
    {
        return $this->belongsTo(Certificate::class, 'cert_id');
    }
}
