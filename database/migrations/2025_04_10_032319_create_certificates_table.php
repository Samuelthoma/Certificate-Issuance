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
        Schema::create('certificates', function (Blueprint $table) {
            $table->id('cert_id');
            $table->unsignedBigInteger('owner_id');
            $table->string('serial_number')->unique();
            $table->longText('certificate');
            $table->string('issuer')->default('MyApp CA');
            $table->enum('status', ['active', 'revoked', 'expired'])->default('active');
            $table->timestamps();
            $table->foreign('owner_id')->references('id')->on('users')->onDelete('cascade');
        });        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('certificates');
    }
};
