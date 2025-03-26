document.addEventListener("DOMContentLoaded", function () {
    const fileInput = document.getElementById("fileInput");
    const previewContainer = document.getElementById("previewContainer");
    const imagePreview = document.getElementById("imagePreview");
    const submitButton = document.getElementById("submitButton");

    // Handle Image Preview
    fileInput.addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                imagePreview.src = e.target.result;
                previewContainer.classList.remove("hidden");
            };
            reader.readAsDataURL(file);
        }
    });

    // Handle Form Submission
    submitButton.addEventListener("click", async function () {
        if (!fileInput.files.length) {
            alert("Please select an image first.");
            return;
        }

        const formData = new FormData();
        formData.append("id_card", fileInput.files[0]); // Ensure field name matches API

        try {
            const response = await fetch("/api/extract-nik", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                const accuracy = result?.data?.nik_accuracy; // Extract accuracy from response

                if (accuracy === "low") {
                    alert("The extracted NIK accuracy is low. Please upload a clearer image.");
                } else if (accuracy === "high") {
                    alert("NIK extracted successfully: " + result.data.nik);
                    window.location.href = "/data-verification"; // Redirect if accuracy is high
                }
            } else {
                alert("Error: " + result.message);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred while processing the image.");
        }
    });
});
