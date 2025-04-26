document.addEventListener("DOMContentLoaded", () => {
    const otpForm = document.getElementById("otp-form");

    

    if (otpForm) {
        // OTP input auto-focus
        document.querySelectorAll(".otp-input").forEach((input, index, elements) => {
            input.addEventListener("input", (event) => {
                if (event.target.value.length === 1 && index < elements.length - 1) {
                    elements[index + 1].focus();
                }
            });

            input.addEventListener("keydown", (event) => {
                if (event.key === "Backspace" && event.target.value.length === 0 && index > 0) {
                    elements[index - 1].focus();
                }
            });
        });
    }
});