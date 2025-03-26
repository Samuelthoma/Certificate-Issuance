@extends('layouts.app')
    @section('header')
        Create Account
    @endsection
    
    @section('content')
        @if(session('error'))
            <div id="notif" class="my-4 p-3 text-sm text-black bg-red-300 rounded-sm text-center">
                {{ session('error') }}
            </div>
        @endif
        <form method="POST" action="/send-otp" class="mb-16">
            @csrf
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="phoneNumber">Username : </label>
                    <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" name="username" id="username" type="text" required/>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="password">Password : </label>
                    <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" name="password" id="password" type="password" required/>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="phoneNumber">Phone Number : </label>
                    <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" name="phone" id="phone" type="tel" required/>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="email">Email :</label>
                    <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" name="email" id="email" type="email" required/>
            </div>
            <div class="mb-4">
                <button class="w-full bg-black text-white py-2 rounded" type="submit">Send OTP</button>
            </div>
        </form>           
    @endsection