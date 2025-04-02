document.addEventListener("DOMContentLoaded", async function() {
    let token = sessionStorage.getItem("token");

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
        document.getElementById("user-email").innerText = data.user.username;
    } catch (error) {
        sessionStorage.removeItem("token");
        window.location.href = "/login";
    }
});

document.getElementById("logoutButton").addEventListener("click", async function() {
    let token = sessionStorage.getItem("token");
    
    await fetch("/api/v1/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
    });

    sessionStorage.removeItem("token");
    window.location.href = "/login";
});