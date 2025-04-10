<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\KeyManagementService;

class KeyManagementServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     *
     * @return void
     */
    public function register()
    {
        $this->app->singleton(KeyManagementService::class, function ($app) {
            return new KeyManagementService();
        });
    }

    /**
     * Bootstrap services.
     *
     * @return void
     */
    public function boot()
    {
        //
    }
}