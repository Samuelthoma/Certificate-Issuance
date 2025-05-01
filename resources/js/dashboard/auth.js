async function checkAndLoadUser() {
    const token = sessionStorage.getItem("token");

    if (!token) {
        window.location.href = "/login";
        return;
    }

    try {
        const response = await fetch("/api/v1/dashboard", {
            method: "GET",
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json" 
            }
        });

        if (!response.ok) {
            throw new Error("Unauthorized");
        }

        const data = await response.json();
        sessionStorage.setItem("user_id", data.user.id);
        sessionStorage.setItem("user_email", data.user.email);
        document.getElementById("user-email").innerText = data.user.username;
    } catch (error) {
        sessionStorage.removeItem("token");
        window.location.href = "/login";
    }
}

function setupLogout() {
    const logoutButton = document.getElementById("logoutButton");
    logoutButton.addEventListener("click", async () => {
        const token = sessionStorage.getItem("token");

        await fetch("/api/v1/logout", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });

        sessionStorage.removeItem("token");
        sessionStorage.clear();
        window.location.href = "/login";
    });
}

export { checkAndLoadUser, setupLogout };
