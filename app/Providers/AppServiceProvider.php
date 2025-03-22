<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Passport\Passport;
use Carbon\Carbon;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Passport::tokensExpireIn(Carbon::now()->addSeconds(5));
        Passport::refreshTokensExpireIn(Carbon::now()->addDays(7));
        Passport::personalAccessTokensExpireIn(Carbon::now()->addMonths(6));
    }
}
