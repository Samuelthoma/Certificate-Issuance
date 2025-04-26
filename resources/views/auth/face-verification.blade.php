@extends('layouts.app')
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
@section('content')

@vite('resources/js/register/face-verification-client.js')

<div class="container text-center">
    <h2 class="text-3xl font-bold mb-8">Face Verification</h2>
    <p class="font-bold mb-3" id="status">Click the button below to start verification.</p>
    
    <div class="video-container">
        <video id="video" autoplay class="w-full rounded-md"></video>
        <canvas id="canvas" style="display: none;"></canvas>
    </div>
    
    <button id="startBtn"class="my-3 w-full bg-black text-white py-2 rounded">Start Verification</button>
    <button id="captureBtn" class="w-full bg-black text-white py-2 rounded" style="display: none;">Capture</button>
</div>

<script type="module">
    document.addEventListener("DOMContentLoaded", () => {
        const videoElement = document.getElementById("video");
        const canvasElement = document.getElementById("canvas");
        const statusElement = document.getElementById("status");
        const startButton = document.getElementById("startBtn");
        const captureButton = document.getElementById("captureBtn");
        
        const faceClient = new FaceVerificationClient("{{ url('/api/face-verification') }}");
        
        faceClient.setElements(videoElement, canvasElement);
        
        faceClient.setCallbacks({
            onStatusUpdate: (message) => {
                statusElement.innerText = message;
                // Show capture button when camera is ready
                if (message.includes("Position your face in the frame")) {
                    captureButton.style.display = "inline-block";
                }
            },
            onChallengeChange: async (challenge, instructions) => {
                await Swal.fire({
                    icon: 'info',
                    text: instructions,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end',
                    timer: 2000,
                });
            },
            onComplete: async () => {
                // Reset UI
                startButton.disabled = false;
                captureButton.style.display = "none";
            },
            onError: async (error) => {
                await Swal.fire({
                    icon: 'error',
                    text: 'Error',
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end',
                    timer: 2000,
                });
                window.location.reload();
                startButton.disabled = false;
                captureButton.style.display = "none";
            }
        });
        
        startButton.addEventListener("click", async () => {
            startButton.disabled = true;
            const success = await faceClient.startVerification();
            if (!success) startButton.disabled = false;
        });
        
        captureButton.addEventListener("click", async () => {
            await faceClient.processCapture();
        });
    });
</script>
@endsection
