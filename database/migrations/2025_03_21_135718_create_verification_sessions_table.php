<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateVerificationSessionsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('verification_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->boolean('initial_face_detected')->default(false);
            $table->boolean('challenge_blink_completed')->default(false);
            $table->boolean('challenge_turn_head_completed')->default(false);
            $table->boolean('challenge_smile_completed')->default(false);
            $table->boolean('verified')->default(false);
            $table->string('verification_token')->nullable()->unique();
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            
            // Index for faster lookups
            $table->index('session_id');
            $table->index('verification_token');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('verification_sessions');
    }
}