<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    @vite('resources/css/app.css')
</head>
<body class="bg-gray-100 font-sans">
    <div class="flex h-screen">
        <div class="w-1/5 bg-white p-6">
            <div class="flex mb-8">
                <img alt="Clarisign logo" height="60" src="{{ asset('images/logo.png') }}" width="60"/>
                <span class="text-2xl font-bold">Clarisign</span>
            </div>
            <p class="text font-semibold mb-6">
                Your Trusted Partner in Digital Signature
            </p>
            <button id="logoutButton" class="px-4 py-1 w-full bg-red-500 text-white rounded-sm hover:bg-red-600 transition">Log Out</button>
        </div>
        <div class="w-4/5 p-6">
            <div class="flex justify-between items-center mb-8">
                <div>
                    <p class="text-2xl text-gray-500 mb-4">Welcome Back</p>
                    <h1 class="text-2xl" id="user-email">Loading...</h1>
                </div>
            </div>
        </div>
    </div> 
    @vite('resources/js/dashboard.js')
</body>
</html>