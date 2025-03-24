<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VerificationSession extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'session_id',
        'user_id',
        'initial_face_detected',
        'challenge_blink_completed',
        'challenge_turn_head_completed',
        'challenge_smile_completed',
        'verified',
        'verification_token',
        'verified_at',
        'expires_at',
        'metadata'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'initial_face_detected' => 'boolean',
        'challenge_blink_completed' => 'boolean',
        'challenge_turn_head_completed' => 'boolean',
        'challenge_smile_completed' => 'boolean',
        'verified' => 'boolean',
        'verified_at' => 'datetime',
        'expires_at' => 'datetime',
        'metadata' => 'array'
    ];
    
    /**
     * Check if all required challenges have been completed
     *
     * @return bool
     */
    public function allChallengesCompleted()
    {
        return $this->initial_face_detected &&
               $this->challenge_blink_completed &&
               $this->challenge_turn_head_completed &&
               $this->challenge_smile_completed;
    }
    
    /**
     * Scope a query to only include valid verification sessions.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeValid($query)
    {
        return $query->where('verified', true)
                    ->where('expires_at', '>', now());
    }
}