@extends('layouts.app')
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    @section('header')
        Login
    @endsection

    @section('content')
        @if(session('error'))
            <div id="notif" class="my-4 p-3 text-sm text-black bg-red-300 rounded-sm text-center">
                {{ session('error') }}
            </div>
        @endif
        <form id="loginForm">
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="email">Email</label>
                <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" id="email" type="email"/>
            </div>
            <div class="mb-6">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="password">Password</label>
                <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" id="password" type="password"/>
            </div>
            <div class="mb-4">
                <button class="w-full bg-black text-white py-2 rounded" type="submit">Login</button>
            </div>
            <p class="text-center text-gray-600 text-sm">
                Don't have an account?
                <a class="text-black font-bold" href="/register">Register now</a>
            </p>
        </form>
        @vite('resources/js/login/login.js')   
    @endsection