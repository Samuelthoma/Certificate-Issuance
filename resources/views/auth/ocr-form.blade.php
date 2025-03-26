@extends('layouts.app')

@section('header')
    Validate Your Data
@endsection

@section('content')
    <form action="">
        <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="phoneNumber">NIK : </label>
            <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" name="nik" id="nik" type="text" required/>
        </div>
        <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="phoneNumber">Name : </label>
            <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" name="name" id="name" type="text" required/>
        </div>
        <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="phoneNumber">Date of Birth : </label>
            <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" name="dob" id="dob" type="date" required/>
        </div>
        <div class="my-5">
            <button class="w-full bg-black text-white py-2 rounded" type="submit">Next</button>
        </div>
    </form>
@endsection