@extends('layouts.app')
    @section('header')
        Check Your Email
    @endsection
    @section('content')
        @if(session('error'))
            <div id="notif" class="my-4 p-3 text-sm text-black bg-red-300 rounded-sm text-center">
                {{ session('error') }}
            </div>
        @endif
                    
        <form id="otp-form" method="POST" action="/verify-otp">
            @csrf   
            <div class="font-bold my-4">OTP Has been Sent to <span class="text-blue-400">{{ session('registration_data')['email'] }}</span></div>
            @for ($i = 0; $i < 6; $i++)
                <input type="text" name="otp[]" maxlength="1" 
                    class="otp-input w-10 h-10 text-center border-2 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-xl font-semibold">
            @endfor
            <div class="my-5">
                <button class="w-full bg-black text-white py-2 rounded" type="submit">Verify OTP</button>
            </div>
        </form>
        <div class="text-center mt-4">
            <form action="/send-otp" method="POST">
                <p>Didn't receive the OTP?</p>
                @csrf
                <input type="hidden" name="email" value="{{ session('registration_data')['email'] ?? '' }}">
                <button type="submit" class="text-blue-500 font-bold border-none bg-transparent cursor-pointer">
                    Resend OTP
                </button>
            </form>
        </div>
    @endsection
        