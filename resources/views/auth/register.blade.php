<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    @vite('resources/css/app.css')
    <title>Register Page</title>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="bg-white shadow-md rounded-lg flex w-full max-w-4xl">
        <div class="w-full md:w-2/5 p-8 my-auto justify-center">
            <h2 class="text-3xl font-bold mb-8">Register</h2>
            <form action="#">
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="email">Name</label>
                    <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" id="email" type="email"/>
                </div>
                <div class="mb-6">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="email">Email</label>
                    <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" id="password" type="password"/>
                </div>
                <div class="mb-6">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="otp">OTP</label>
                    <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" id="password" type="password"/>
                </div>
                <div class="mb-6">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="password">Password</label>
                    <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" id="password" type="password"/>
                </div>
                <div class="mb-4">
                    <button class="w-full bg-black text-white py-2 rounded" type="submit">Register</button>
                </div>
            </form>
        </div>
        <div class="hidden md:block md:w-3/5">
            <img alt="A blurred image of a keyboard and a desk setup" class="w-full h-full object-cover rounded-r-lg" height="400" src="https://storage.googleapis.com/a1aa/image/2DRcrQOjNaXK-xEfW8SEH_eV8KdUZ6doE_VFoTwXyaM.jpg" width="600"/>
        </div>
    </div>
</body>
</html>