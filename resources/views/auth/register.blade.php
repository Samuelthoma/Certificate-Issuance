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
            <form method="POST" action="/send-otp" class="mb-16">
                @csrf
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="email">Email</label>
                    <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" name="email" id="email" type="email" required/>
                </div>
                @if(session('success'))
                    <div id="notif" class="my-4 p-3 text-sm text-black bg-green-300 rounded-sm text-center">
                        {{ session('success') }}
                    </div>
                @endif
                <div class="mb-4">
                    <button class="w-full bg-black text-white py-2 rounded" type="submit">Send OTP</button>
                </div>
            </form>
            <form action="#">
                @csrf
                <div class="flex justify-center space-x-2 mb-8">
                    <input type="text" name="otp[]" maxlength="1" class="otp-input w-10 h-10 text-center border-2 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-xl font-semibold">
                    <input type="text" name="otp[]" maxlength="1" class="otp-input w-10 h-10 text-center border-2 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-xl font-semibold">
                    <input type="text" name="otp[]" maxlength="1" class="otp-input w-10 h-10 text-center border-2 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-xl font-semibold">
                    <input type="text" name="otp[]" maxlength="1" class="otp-input w-10 h-10 text-center border-2 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-xl font-semibold">
                    <input type="text" name="otp[]" maxlength="1" class="otp-input w-10 h-10 text-center border-2 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-xl font-semibold">
                    <input type="text" name="otp[]" maxlength="1" class="otp-input w-10 h-10 text-center border-2 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-xl font-semibold">
                </div>
                <div class="mb-4">
                    <button class="w-full bg-black text-white py-2 rounded" type="submit">Verify OTP</button>
                </div>
            </form>
        </div>
        <div class="hidden md:block md:w-3/5">
            <img alt="A blurred image of a keyboard and a desk setup" class="w-full h-full object-cover rounded-r-lg" height="400" src="https://storage.googleapis.com/a1aa/image/2DRcrQOjNaXK-xEfW8SEH_eV8KdUZ6doE_VFoTwXyaM.jpg" width="600"/>
        </div>
    </div>
    <script>
        // Automatically move focus to next box when a digit is entered
        document.querySelectorAll('.otp-input').forEach((input, index, elements) => {
            input.addEventListener('input', (event) => {
                if (event.target.value.length === 1) {
                    if (index < elements.length - 1) {
                        elements[index + 1].focus();
                    }
                }
            });

            input.addEventListener('keydown', (event) => {
                if (event.key === "Backspace" && event.target.value.length === 0) {
                    if (index > 0) {
                        elements[index - 1].focus();
                    }
                }
            });
        });
    </script>
</body>
</html>