<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" rel="stylesheet" />
    @vite(['resources/css/app.css', 'resources/js/dashboard.js'])
</head>
    
<body class="bg-gray-100 font-sans h-screen overflow-hidden">
    <div class="flex h-screen">
        <!-- Sidebar -->
        <div class="w-64 fixed h-screen top-0 left-0 z-10 bg-white p-6 md:relative md:w-1/4 transition-transform transform -translate-x-full md:translate-x-0" id="sidebar">
            <div class="flex items-center mb-8">
                <img alt="Clarisign logo" height="45" src="{{ asset('images/logo.png') }}" width="45"/>
                <span class="text-xl font-bold ml-2">
                    Clarisign
                </span>
            </div>
            <button class="md:hidden text-gray-500" onclick="toggleSidebar()">
                <i class="fas fa-times"></i>
            </button>
            <p class="text-sm font-semibold mb-6">
                Your Trusted Partner in Digital Identity Verification
            </p>

            <nav class="space-y-4">
                <a class="flex items-center text-black" href="#">
                    <i class="fas fa-th-large mr-2"></i>
                    Dashboard
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
                <a id="logoutButton" class="flex items-center text-red-500">
                    <i class="fas fa-sign-out-alt mr-2"></i>
                    Log Out
                </a>
            </nav>
        </div>
        <!-- Main Content -->
        <div class="flex-1 overflow-y-auto p-6">
            <div class="flex justify-between items-center mb-8">
                <button class="md:hidden text-gray-500" onclick="toggleSidebar()">
                    <i class="fas fa-bars text-xl"></i>
                </button>
                <div>
                    <p class="text-sm text-black font-semibold">
                        Welcome back, Glad to see you again! 
                    </p>
                    <h1 class="text-2xl my-2 italic" id="user-email">
                    </h1>
                </div>
                <div class="flex items-center space-x-4">
                    <i class="fas fa-bell text-xl text-gray-500">
                    </i>
                    <i class="fas fa-user-circle text-xl text-gray-500">
                    </i>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-8">
                <div class="bg-gray-200 text-black p-4 flex items-center justify-between">
                    <span class="text-2xl font-bold">
                        0
                    </span>
                    <span class="text-sm">
                        Draft
                    </span>
                    <i class="fas fa-pencil-alt text-gray-500">
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
                <label class="flex flex-row items-center p-2 bg-black border-2 border-black rounded-sm shadow-md cursor-pointer w-full lg:w-1/4 justify-center mx-auto">
                    <i class="fas fa-cloud-upload-alt mr-2 text-white"></i>
                    <span class="text-md ml-2 text-white">Upload & Sign</span>
                    <input type="file" id="uploadInput" class="hidden">
                </label>
            </div>
            <div class="text-xl font-bold my-8">
                Documents
            </div>
            <div id="documentList" class="space-y-4 mt-4"></div>
        </div>
    </div>
    <script>
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('-translate-x-full');
        }
    </script>
</body>
</html>
