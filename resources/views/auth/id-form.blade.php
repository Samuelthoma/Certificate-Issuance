@extends('layouts.app')

@section('header')
    Capture Your KTP
@endsection

@section('content')
<div class="relative w-full max-w-md aspect-[4/3] bg-black rounded-lg overflow-hidden">
    <video id="video" autoplay class="w-full h-full"></video>
    <img id="preview" class="hidden w-full h-full object-cover" />

    <!-- Face Frame (Now Larger & Properly Positioned) -->
    <div id="frame" class="absolute inset-y-0 right-5 flex items-center pointer-events-none">
        <div class="w-24 h-30 border-4 border-blue-500"></div>
    </div>

</div>

<!-- Capture & Capture Again Buttons -->
<button id="capture-btn" class="my-5 w-full bg-black text-white py-2 rounded">
    Capture
</button>

<!-- Submit Button (Initially Hidden) -->
<form id="submit-form" class="hidden" method="POST" action="/submit-ktp">
    @csrf
    <input type="hidden" name="captured_image" id="captured-image-input">
    <button type="submit" class="w-full bg-green-500 text-white py-2 rounded">Submit</button>
</form>

<script>
    const video = document.getElementById('video');
    const preview = document.getElementById('preview');
    const frame = document.getElementById('frame');
    const captureBtn = document.getElementById('capture-btn');
    const submitForm = document.getElementById('submit-form');
    const capturedImageInput = document.getElementById('captured-image-input');

    let stream;

    // Start Camera
    function startCamera() {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(camStream => {
                stream = camStream;
                video.srcObject = stream;
                video.classList.remove("hidden");
                preview.classList.add("hidden");
                frame.classList.remove("hidden"); // Show face frame
                captureBtn.textContent = "Capture";
                submitForm.classList.add("hidden");
            })
            .catch(error => console.error("Error accessing camera:", error));
    }

    startCamera(); // Start camera on page load

    // Capture Image (Face Area)
    captureBtn.addEventListener('click', () => {
        if (!video.classList.contains("hidden")) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Crop the Face Area in KTP (Aligned to the Right)
            const cropX = canvas.width * 0.55;
            const cropY = canvas.height * 0.20;
            const cropWidth = canvas.width * 0.40;
            const cropHeight = cropWidth * (4 / 3);

            // Create Cropped Image
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = cropWidth;
            croppedCanvas.height = cropHeight;
            const croppedCtx = croppedCanvas.getContext('2d');
            croppedCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

            // Show Captured Face Image
            const imageDataURL = croppedCanvas.toDataURL('image/png');
            preview.src = imageDataURL;
            preview.classList.remove("hidden");
            video.classList.add("hidden");
            frame.classList.add("hidden"); // Hide face frame
            captureBtn.textContent = "Capture Again";

            // Store Image Data for Submission
            capturedImageInput.value = imageDataURL;
            submitForm.classList.remove("hidden");

            // Stop Camera
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        } else {
            startCamera(); // Restart camera when clicking "Capture Again"
        }
    });
</script>
@vite('resources/js/ocr-form.js')
@endsection
