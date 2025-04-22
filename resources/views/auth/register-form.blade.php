@extends('layouts.app')

@section('header')
    Create Account
@endsection

@section('content')

    {{-- ✅ Validation Errors --}}
    @if ($errors->any())
        <div id="notif" class="my-4 p-3 text-sm text-black bg-red-300 rounded-sm text-center">
            <ul class="list-disc list-inside text-left">
                @foreach ($errors->all() as $error)
                    <li>{{ $error }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    {{-- ✅ Session Error --}}
    @if(session('error'))
        <div id="notif" class="my-4 p-3 text-sm text-black bg-red-300 rounded-sm text-center">
            {{ session('error') }}
        </div>
    @endif

    {{-- ✅ Session Success --}}
    @if(session('success'))
        <div id="notif" class="my-4 p-3 text-sm text-black bg-green-300 rounded-sm text-center">
            {{ session('success') }}
        </div>
    @endif

    <form method="POST" action="/send-otp">
        @csrf
        <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="username">Username : </label>
            <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500"
                   name="username" id="username" type="text" value="{{ old('username') }}" required/>
        </div>
        <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="password">Password : </label>
            <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500"
                   name="password" id="password" type="password" required/>
        </div>
        <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="phone">Phone Number : </label>
            <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500"
                   name="phone" id="phone" type="tel" value="{{ old('phone') }}" required/>
        </div>
        <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="email">Email :</label>
            <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500"
                   name="email" id="email" type="email" value="{{ old('email') }}" required/>
        </div>
        <div class="mb-4">
            <button class="w-full bg-black text-white py-2 rounded" type="submit">Send OTP</button>
        </div>
    </form>
    <div class="text-center">
        <p class="text-sm text-gray-600">Already have an account? <a href="/login" class="text-blue-500">Login</a></p>
    </div>
    <!-- <p class="text-sm text-gray-700 text-center mt-4">Already have an account? 
        <a href="login" class="text-blue-600 hover:underline font-medium">Login</a>
    </p> -->


@endsection
