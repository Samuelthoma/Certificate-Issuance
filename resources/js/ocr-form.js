document.addEventListener("DOMContentLoaded", function () {
    // **Handle Image Preview (Only If File Input Exists)**
    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
        const previewContainer = document.getElementById("previewContainer");
        const imagePreview = document.getElementById("imagePreview");

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
    }

    // **Handle Form Submission (Only If Submit Button Exists)**
    const submitButton = document.getElementById("submitButton");
    if (submitButton) {
        submitButton.addEventListener("click", async function () {
            if (!fileInput || !fileInput.files.length) {
                alert("Please select an image first.");
                return;
            }

            const formData = new FormData();
            formData.append("id_card_image", fileInput.files[0]); // Ensure field name matches API

            try {
                const response = await fetch("/api/extract-nik", {
                    method: "POST",
                    body: formData,
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    // Show success message
                    alert("KTP data extracted successfully!");

                    function convertDateFormat(dateStr) {
                        if (dateStr.includes("-")) {
                            let parts = dateStr.split("-"); // Split "18-01-1987" into ["18", "01", "1987"]
                            return `${parts[2]}-${parts[1]}-${parts[0]}`; // Rearrange to "yyyy-MM-dd"
                        }
                        return dateStr; // Return unchanged if format is invalid
                    }
                    sessionStorage.setItem("ocr_nik", result.nik);
                    sessionStorage.setItem("ocr_name", result.name);
                    sessionStorage.setItem("ocr_dob", convertDateFormat(result.dob));
                    window.location.href = result.redirect || "/ocr-form";
                } else {
                    alert("Error: " + (result.message || "Failed to process image"));
                }
            } catch (error) {
                console.error("Error:", error);
                alert("An error occurred while processing the image.");
            }
        });
    }

    // **Handle NIK Verification (Only If NIK Input Exists)**
    const nikInput = document.getElementById("nikInput");
    const nikVerifyButton = document.getElementById("nikVerifyButton");

    if (nikInput && nikVerifyButton) {
        const errorMessage = document.getElementById("errorMessage");
        const nameInput = document.getElementById("nameInput");
        const dobInput = document.getElementById("dobInput");

        function showError(message) {
            errorMessage.classList.remove("hidden");
            errorMessage.textContent = message;
        }

        function verifyNik() {
            // Reset previous error
            errorMessage.classList.add("hidden");
            errorMessage.textContent = "";

            // Validate NIK input
            const nik = nikInput.value.trim();
            const name = nameInput.value.trim();
            const dob = dobInput.value;

            if (nik.length !== 16 || !/^\d{16}$/.test(nik)) {
                showError("NIK must be exactly 16 digits");
                return;
            }

            if (name.length < 2) {
                showError("Please enter a valid name");
                return;
            }

            if (!dob) {
                showError("Please select a date of birth");
                return;
            }

            // Prepare form data
            const formData = new FormData();
            formData.append("nik", nik);
            formData.append("name", name);
            formData.append("dob", dob);

            // Send verification request
            fetch("/api/verify-nik", {
                method: "POST",
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    window.location.href = "/face-verification";
                } else {
                    showError(data.message || 'NIK verification failed');
                }
            })
            .catch(error => {
                console.error('Verification Error:', error);
                showError('An unexpected error occurred during verification');
            });
        }
        nikVerifyButton.addEventListener("click", verifyNik);
    }

    document.getElementById("nikInput").value = sessionStorage.getItem("ocr_nik");
    document.getElementById("nameInput").value = sessionStorage.getItem("ocr_name");
    document.getElementById("dobInput").value = sessionStorage.getItem("ocr_dob");
});