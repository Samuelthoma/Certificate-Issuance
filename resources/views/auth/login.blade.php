<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    @vite('resources/css/app.css')
    <title>Login Page</title>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="bg-white shadow-md rounded-lg flex w-full max-w-4xl">
        <div class="w-full md:w-2/5 p-8 my-auto justify-center">
            <h2 class="text-3xl font-bold mb-8">Login</h2>
            <form id="loginForm">
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="email">Email</label>
                    <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" id="email" type="email"/>
                </div>
                <div class="mb-6">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="password">Password</label>
                    <input class="w-full py-2 border-b border-black focus:outline-none focus:border-blue-500" id="password" type="password"/>
                </div>
                <div class="mb-4">
                    <button class="w-full bg-black text-white py-2 rounded" type="submit">Login</button>
                </div>
                <p class="text-center text-gray-600 text-sm">
                Don't have an account?
                <a class="text-black font-bold" href="/register">Register now</a>
                </p>
            </form>
        </div>
        <div class="hidden md:block md:w-3/5">
            <img alt="A blurred image of a keyboard and a desk setup" class="w-full h-full object-cover rounded-r-lg" height="400" src="https://storage.googleapis.com/a1aa/image/2DRcrQOjNaXK-xEfW8SEH_eV8KdUZ6doE_VFoTwXyaM.jpg" width="600"/>
        </div>
    </div>
    <script>
        document.getElementById("loginForm").addEventListener("submit", async function(event) {
            event.preventDefault();

            let email = document.getElementById("email").value;
            let password = document.getElementById("password").value;

            try {
                let response = await fetch("/api/v1/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                let data = await response.json();

                if (response.ok) {
                    localStorage.setItem("token", data.token);
                    window.location.href = "/dashboard";
                } else {
                    alert(data.error || "Login failed");
                }
            } catch (error) {
                alert("Something went wrong, please try again.");
            }
        });
    </script>
</body>
</html>