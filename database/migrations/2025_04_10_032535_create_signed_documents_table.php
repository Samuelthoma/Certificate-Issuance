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
        Schema::create('signed_documents', function (Blueprint $table) {
            $table->id();
            $table->uuid('document_id');
            $table->unsignedBigInteger('signer_id');
            $table->unsignedBigInteger('certificate_id');
            $table->longText('signed_file_data');
            $table->unsignedInteger('signed_page');
            $table->string('sign_location');
            $table->timestamp('signed_at')->useCurrent();
            $table->foreign('document_id')->references('id')->on('documents');
            $table->foreign('signer_id')->references('id')->on('users');
            $table->foreign('certificate_id')->references('cert_id')->on('certificates');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('signed_documents');
    }
};
