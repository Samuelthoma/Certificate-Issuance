<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('signing_requests', function (Blueprint $table) {
            $table->id();
            $table->uuid('document_id');
            $table->unsignedBigInteger('requester_id');
            $table->unsignedBigInteger('target_user_id');
            $table->unsignedBigInteger('signature_id');
            $table->enum('status', ['pending', 'completed', 'declined'])->default('pending');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->foreign('document_id')->references('id')->on('documents')->cascadeOnDelete();
            $table->foreign('requester_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('target_user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('signature_id')->references('id')->on('signatures')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('signing_requests');
    }
};
