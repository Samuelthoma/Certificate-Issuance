<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateSignatureNoncesTable extends Migration
{
    public function up(): void
    {
        Schema::create('signature_nonces', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nonce')->unique();
            $table->unsignedBigInteger('user_id');
            $table->uuid('document_id');
            $table->string('hash', 128); // SHA-256 is 64 hex chars (or 128 base64)
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('used')->default(false);
            $table->timestamp('signed_at')->nullable();
            $table->enum('status', ['pending', 'used', 'expired', 'revoked'])->default('pending');
            $table->ipAddress('ip_address')->nullable();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('document_id')->references('id')->on('documents')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('signature_nonces');
    }
}
