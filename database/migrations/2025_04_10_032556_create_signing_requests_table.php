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
        Schema::create('signing_requests', function (Blueprint $table) {
            $table->id();
            $table->uuid('document_id');
            $table->unsignedBigInteger('requester_id');
            $table->unsignedBigInteger('target_user_id');
            $table->unsignedInteger('target_page');
            $table->string('target_location');
            $table->enum('status', ['pending', 'completed', 'declined'])->default('pending');
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('document_id')->references('id')->on('documents');
            $table->foreign('requester_id')->references('id')->on('users');
            $table->foreign('target_user_id')->references('id')->on('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('signing_requests');
    }
};
