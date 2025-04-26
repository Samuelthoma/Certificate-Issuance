<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
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
            $table->timestamps();
            
            $table->foreign('document_id')->references('id')->on('documents')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('signatures');
    }
};
