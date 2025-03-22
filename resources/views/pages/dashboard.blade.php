<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <h1>Dashboard</h1>
    <p>User Email: <span id="user-email">Loading...</span></p>
    <button id=""logoutButton>logout</button>
</body>
<script>
    document.addEventListener("DOMContentLoaded", async function() {
        let token = localStorage.getItem("token");

        if (!token) {
            window.location.href = "/login";
            return;
        }

        try {
            let response = await fetch("/api/v1/dashboard", {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
            });

            if (!response.ok) {
                throw new Error("Unauthorized");
            }

            let data = await response.json();
            document.getElementById("user-email").innerText = data.user.email;
        } catch (error) {
            localStorage.removeItem("token");
            window.location.href = "/login";
        }
    });

    document.getElementById("logoutButton").addEventListener("click", async function() {
        let token = localStorage.getItem("token");

        await fetch("/api/v1/logout", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });

        localStorage.removeItem("token");
        window.location.href = "/login";
    });
</script>

</html>