<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->string('file_name');
            $table->string('file_type');
            $table->unsignedBigInteger('file_size');
            $table->longText('encrypted_file_data');
            $table->enum('version_type', ['original', 'signed', 'duplicate'])->default('original');
            $table->enum('status', ['draft', 'pending', 'finalized', 'revoked'])->default('draft');
            $table->uuid('parent_document_id')->nullable();
            $table->string('iv');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable();        
            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('parent_document_id')->references('id')->on('documents');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
