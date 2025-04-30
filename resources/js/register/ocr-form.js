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
            }else{
                window.location.reload();
            }
        });
    }

    // **Handle Form Submission (Only If Submit Button Exists)**
    const submitButton = document.getElementById("submitButton");
    if (submitButton) {
        submitButton.addEventListener("click", async function () {
            if (!fileInput || !fileInput.files.length) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    text: 'Please upload an image of your KTP',
                    showConfirmButton: false,
                    timer: 3000,
                });
                return;
            }
    
            const formData = new FormData();
            formData.append("id_card_image", fileInput.files[0]); // Ensure field name matches API
    
            try {

                document.getElementById("spinner").classList.remove("hidden");
                document.getElementById("spinner").classList.add("flex");
                const response = await fetch("/api/extract-nik", {
                    method: "POST",
                    body: formData,
                });
    
                const result = await response.json();
    
                if (response.ok && result.success) {
                    // Validate NIK format - must be exactly 16 digits
                    if (!result.nik || result.nik.length !== 16 || !/^\d{16}$/.test(result.nik)) {
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'warning',
                            text: 'Your KTP image is unclear or the NIK could not be properly extracted. Please take a clearer picture and try again.',
                            showConfirmButton: false,
                            timer: 5000,
                        });
                        return;
                    }

                    // Validate that name is present and not empty
                    if (!result.name || result.name.trim() === '') {
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'warning',
                            text: 'Your name could not be properly extracted from the KTP. Please take a clearer picture and try again.',
                            showConfirmButton: false,
                            timer: 5000,
                        });
                        return;
                    }

                    // Validate that DOB has the expected format (DD-MM-YYYY)
                    if (!result.dob || !/^\d{2}-\d{2}-\d{4}$/.test(result.dob)) {
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'warning',
                            text: 'Your date of birth could not be properly extracted from the KTP. Please take a clearer picture and try again.',
                            showConfirmButton: false,
                            timer: 5000,
                        });
                        return;
                    }

                    await fetch("/update-registration-file", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').getAttribute("content")
                        },
                    });

                    function reverseDateFormat(dateStr) {
                        const parts = dateStr.split("-");
                        if (parts.length !== 3) return dateStr; 
                        const [day, month, year] = parts;
                        return `${year}-${month}-${day}`;
                    }

                    sessionStorage.setItem("ocr_nik", result.nik);
                    sessionStorage.setItem("ocr_name", result.name);
                    sessionStorage.setItem("ocr_dob", reverseDateFormat(result.dob));

                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        text: 'KTP Data Extracted Successfully!',
                        showConfirmButton: false,
                        timer: 4000,
                        timerProgressBar: true,
                    }).then(() => {
                        window.location.href = "/ocr-form";
                    });
    
                } else {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        text: 'Failed to extract KTP data. Please try again.',
                        showConfirmButton: false,
                        timer: 3000,
                    });
                }
            } catch (error) {
                console.error("Error:", error);
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    text: 'An error occurred while processing your request.',
                    showConfirmButton: false,
                    timer: 3000,
                });
            } finally {
                document.getElementById("spinner").classList.add("hidden");
                document.getElementById("spinner").classList.remove("flex");
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
     
        async function verifyNik() { 
            errorMessage.classList.add("hidden"); 
            errorMessage.textContent = ""; 
     
            const nik = nikInput.value.trim(); 
            const name = nameInput.value.trim(); 
            const dob = dobInput.value; 
     
            // Frontend validation
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
     
            try {
                // Backend NIK verification using verify-nik endpoint
                const verifyResponse = await fetch("/api/verify-nik", { 
                    method: "POST", 
                    headers: { 
                        "Content-Type": "application/json", 
                        "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').getAttribute("content"), 
                    }, 
                    body: JSON.stringify({ nik, name, dob }), 
                });
    
                const verifyData = await verifyResponse.json();
                
                if (!verifyResponse.ok || verifyData.status !== 'success') {
                    showError(verifyData.message || "NIK verification failed");
                    return;
                }
                
                // If verification passes, proceed to update registration form as before
                const response = await fetch("/update-registration-form", { 
                    method: "POST", 
                    headers: { 
                        "Content-Type": "application/json", 
                        "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').getAttribute("content"), 
                    }, 
                    body: JSON.stringify({ nik, name, dob }), 
                }); 
     
                const data = await response.json(); 
     
                if (response.ok) { 
                    window.location.href = "/face-verification"; 
                } else { 
                    showError(data.message || "Registration update failed"); 
                } 
            } catch (error) { 
                console.error("Verification Error:", error); 
                showError("An unexpected error occurred during verification"); 
            } 
        } 
     
        nikVerifyButton.addEventListener("click", verifyNik); 
    }
    
    // Autofill fields with sessionStorage
    document.getElementById("nikInput").value = sessionStorage.getItem("ocr_nik") || "";
    document.getElementById("nameInput").value = sessionStorage.getItem("ocr_name") || "";
    document.getElementById("dobInput").value = sessionStorage.getItem("ocr_dob") || "";
    
});