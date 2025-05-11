@if(session('alert'))
    <script>
        alert("{{ session('alert') }}");
    </script>
@endif


<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    @vite(['resources/css/app.css'])
</head>
    
<body class="bg-gray-100 font-sans h-screen overflow-hidden">
    <div class="flex h-screen">
        <!-- Sidebar -->
        <div class="w-64 fixed h-screen top-0 left-0 z-10 bg-white p-6 md:relative md:w-1/4 transition-transform transform -translate-x-full md:translate-x-0" id="sidebar">
            <div class="flex items-center mb-8 mx-4">
                <img alt="Clarisign logo" height="45" src="{{ asset('images/logo.png') }}" width="45"/>
                <span class="text-xl font-bold ml-2">
                    Clarisign
                </span>
            </div>
            <button class="md:hidden text-gray-500" onclick="toggleSidebar()">
                <i class="fas fa-times"></i>
            </button>
            <p class="text-md font-semibold mb-6 px-7 font-mono">
                "Your Trusted Partner in Digital Identity Verification"
            </p>

            <nav class="space-y-3 px-4 pb-4">
                <a class="flex items-center text-black p-3 hover:bg-gray-300 hover:rounded-md font-semibold" href="/dashboard">
                    <i class="fas fa-th mr-2 w-5 text-center"></i>
                    Dashboard
                </a>

                <a class="flex items-center text-black p-3 hover:bg-gray-300 hover:rounded-md font-semibold" href="#">
                    <i class="fas fa-pencil-alt mr-2 w-5 text-center">
                    </i>
                    Draft
                </a>

                <a class="flex items-center text-black p-3 hover:bg-gray-300 hover:rounded-md font-semibold" href="#">
                    <i class="fas fa-clock mr-2 w-5 text-center"></i>
                    Pending
                </a>

                <a class="flex items-center text-black p-3 hover:bg-gray-300 hover:rounded-md font-semibold" href="#">
                    <i class="fas fa-check-square mr-2 w-5 text-center"></i>
                    Completed
                </a>

                <a class="flex items-center text-black p-3 hover:bg-gray-300 hover:rounded-md font-semibold" href="#">
                    <i class="fas fa-ban mr-2 w-5 text-center"></i>
                    Declined
                </a>

                <a class="flex items-center text-black p-3 hover:bg-gray-300 hover:rounded-md font-semibold" href="#">
                    <i class="fas fa-file-alt mr-2 w-5 text-center"></i>
                    Reports
                </a>

                <a class="flex items-center text-black p-3 hover:bg-gray-300 hover:rounded-md font-semibold" href="/shared-with-me">
                    <i class="fas fa-users mr-2 w-5 text-center"></i>
                    Shared With Me
                </a>
                <a id="logoutButton" class="flex items-center text-red-500 p-3 hover:bg-red-100 hover:rounded-md font-semibold cursor-pointer">
                    <i class="fas fa-sign-out-alt mr-2 w-5 text-center"></i>
                    Log Out
                </a>
            </nav>
        </div>
        <!-- Main Content -->
        <div class="flex-1 overflow-y-auto p-6">
        @yield('content')
        </div>
    </div>
    <script>
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('-translate-x-full');
        }
    </script>
</body>
</html>
