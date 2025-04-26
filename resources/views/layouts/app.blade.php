<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @vite(['resources/css/app.css', 'resources/js/register/register.js'])
    <title>Register Page</title>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="bg-white shadow-md rounded-lg flex w-full h-150 max-w-4xl">
        <div class="w-full md:w-2/5 p-8 my-auto justify-center">
            <h2 class="text-3xl font-bold mb-8">
                @yield('header')
            </h2>
            @yield('content')
        </div>
        <div class="hidden md:block md:w-3/5">
            <img alt="A blurred image of a keyboard and a desk setup" class="w-full h-full object-cover rounded-r-lg" height="400" src="https://storage.googleapis.com/a1aa/image/2DRcrQOjNaXK-xEfW8SEH_eV8KdUZ6doE_VFoTwXyaM.jpg" width="600"/>
        </div>
    </div>
    <!-- <pre>{{ print_r(session()->all(), true) }}</pre> -->
</body>
</html>