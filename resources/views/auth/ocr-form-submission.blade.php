@extends('layouts.app')

@section('header')
    Validate Your Data
@endsection

@section('content')
    <form id="nikVerificationForm">
        @csrf
        <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="nik">NIK : </label>
            <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" 
                    name="nik" 
                    id="nikInput" 
                    type="text" 
                    required 
                    maxlength="16" 
                    pattern="\d{16}"
                    title="NIK must be exactly 16 digits"/>
        </div>
        <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="name">Name : </label>
            <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" 
                    name="name" 
                    id="nameInput" 
                    type="text" 
                    required/>
        </div>
        <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="dob">Date of Birth : </label>
            <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" 
                    name="dob" 
                    id="dobInput" 
                    type="date" 
                    required/>
        </div>
        <div id="errorMessage" class="text-red-500 mb-4 hidden"></div>
        <div class="my-5">
            <button id="nikVerifyButton" class="w-full bg-black text-white py-2 rounded" type="button">Next</button>
        </div>
    </form>

    @vite('resources/js/register/ocr-form.js')
@endsection