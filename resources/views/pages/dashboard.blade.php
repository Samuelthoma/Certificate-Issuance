<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" rel="stylesheet" />
    @vite('resources/css/app.css')
</head>
    
<body class="bg-gray-100 font-sans">
    <div class="flex h-screen">
        <!-- Sidebar -->
        <div class="w-1/4 bg-white p-6">
            <div class="flex items-center mb-8">
                <img alt="Clarisign logo" height="60" src="{{ asset('images/logo.png') }}" width="60"/>
                <span class="text-xl font-bold">
                    Clarisign
                </span>
            </div>
            <p class="text-sm font-semibold mb-6">
                Your Trusted Partner in Digital Identity Verification
            </p>
            <button class="w-full bg-black text-white py-2 mb-6 flex items-center justify-center">
                <i class="fas fa-cloud-upload-alt mr-2"></i>
                Upload document
            </button>

            <nav class="space-y-4">
                <a class="flex items-center text-black" href="#">
                    <i class="fas fa-th-large mr-2"></i>
                    Dashboard
                </a>

                <a class="flex items-center text-black" href="#">
                    <i class="fas fa-paper-plane mr-2">
                    </i>
                    Sent
                </a>

                <a class="flex items-center text-black" href="#">
                    <i class="fas fa-pencil-alt mr-2">
                    </i>
                    Draft
                </a>

                <a class="flex items-center text-black" href="#">
                    <i class="fas fa-clock mr-2"></i>
                    Pending
                </a>

                <a class="flex items-center text-black" href="#">
                    <i class="fas fa-check-square mr-2"></i>
                    Completed
                </a>

                <a class="flex items-center text-black" href="#">
                    <i class="fas fa-ban mr-2"></i>
                    Declined
                </a>

                <a class="flex items-center text-black" href="#">
                    <i class="fas fa-file-alt mr-2"></i>
                    Reports
                </a>
                <button id="logoutButton" class="px-4 py-1 w-full bg-red-500 text-white rounded-sm hover:bg-red-600 transition">Log Out</button>
            </nav>
        </div>
        <!-- Main Content -->
        <div class="flex-1 p-6">
            <div class="flex justify-between items-center mb-8">
                <div>
                    <p class="text-sm text-gray-500">
                        Welcome back,
                    </p>
                    <h1 class="text-2xl" id="user-email">
                        Loading...
                    </h1>
                    <p class="text-sm text-gray-500">
                        Glad to see you again!
                    </p>
                </div>
                <div class="flex items-center space-x-4">
                    <i class="fas fa-bell text-xl text-gray-500">
                    </i>
                    <i class="fas fa-user-circle text-xl text-gray-500">
                    </i>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-8">
                <div class="bg-black text-white p-4 flex items-center justify-between">
                    <span class="text-2xl font-bold">
                        1
                    </span>
                    <span class="text-sm">
                        Draft
                    </span>
                    <i class="fas fa-pencil-alt text-green-500">
                    </i>
                </div>
                <div class="bg-gray-200 text-black p-4 flex items-center justify-between">
                    <span class="text-2xl font-bold">
                        0
                    </span>
                    <span class="text-sm">
                        Pending
                    </span>
                    <i class="fas fa-clock text-gray-500">
                    </i>
                </div>
                <div class="bg-gray-200 text-black p-4 flex items-center justify-between">
                    <span class="text-2xl font-bold">
                        0
                    </span>
                    <span class="text-sm">
                        Completed
                    </span>
                    <i class="fas fa-check-square text-gray-500">
                    </i>
                </div>
                <div class="bg-gray-200 text-black p-4 flex items-center justify-between">
                    <span class="text-2xl font-bold">
                        0
                    </span>
                    <span class="text-sm">
                        Declined
                    </span>
                    <i class="fas fa-ban text-gray-500">
                    </i>
                </div>
            </div>
            <div class="border-2 border-dashed border-gray-300 p-8 text-center">
                <p class="text-sm mb-4">
                    Create your envelope here
                </p>
                <p class="text-xs text-gray-500 mb-4">
                    Supported files: PDF, Word, Excel, PowerPoint, JPG, PNG, Text
                </p>
                <button class="bg-black text-white py-2 px-4 flex items-center justify-center mx-auto">
                    <i class="fas fa-cloud-upload-alt mr-2">
                    </i>
                    Upload document
                </button>
            </div>
        </div>
    </div>
    @vite('resources/js/dashboard.js')
</body>
</html>