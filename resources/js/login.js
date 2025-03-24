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
            sessionStorage.setItem("token", data.token);
            window.location.href = "/dashboard";
        } else {
            alert(data.error || "Login failed");
        }
    } catch (error) {
        alert("Something went wrong, please try again.");
    }
});