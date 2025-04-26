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
        Schema::create('signatures', function (Blueprint $table) {
            $table->id();
            $table->uuid('document_id');
            $table->unsignedInteger('page');
            $table->float('rel_x');
            $table->float('rel_y');
            $table->float('rel_width');
            $table->float('rel_height');
            $table->enum('type', ['typed', 'drawn']);
            $table->longText('content'); // Text for typed or Base64 image for drawn
            $table->timestamps();

            $table->foreign('document_id')->references('id')->on('documents')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('signatures');
    }
};
