@extends('layouts.app')

@section('content')

@vite('resources/js/face-verification-client.js')

<div class="container text-center">
    <h2>Face Verification</h2>
    <p id="status">Click the button below to start verification.</p>
    
    <div class="video-container">
        <video id="video" autoplay></video>
        <canvas id="canvas" style="display: none;"></canvas>
    </div>
    
    <button id="startBtn" class="btn btn-primary mt-3">Start Verification</button>
    <button id="captureBtn" class="btn btn-success mt-3 ms-2" style="display: none;">Capture</button>
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
            onChallengeChange: (challenge, instructions) => alert(instructions),
            onComplete: (token) => {
                alert("Verification complete! Token: " + token);
                // Reset UI
                startButton.disabled = false;
                captureButton.style.display = "none";
            },
            onError: (error) => {
                alert("Error: " + error);
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