@extends('layouts.app')

@section('header')
    Upload Your ID Card
@endsection

@section('content')
    <form>
        <label class="flex flex-row items-center p-2 bg-white border border-gray-300 rounded-lg shadow-md cursor-pointer hover:bg-gray-200">
            <svg class="w-5 h-5 mb-1 text-gray-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 12l-4-4m0 0l-4 4m4-4v12"></path>
            </svg>
            <span class="text-md ml-2 font-medium text-gray-600">Choose a file</span>
            <input type="file" id="fileInput" class="hidden" accept="image/*" required>
        </label>

        <!-- Image Preview -->
        <div id="previewContainer" class="mt-4 hidden">
            <img id="imagePreview" class="w-full h-full object-cover rounded-lg shadow-md">
        </div>
        <div class="my-5">
            <button class="w-full bg-black text-white py-2 rounded" type="submit">Submit</button>
        </div>
    </form>

    <script>
        document.getElementById("fileInput").addEventListener("change", function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById("imagePreview").src = e.target.result;
                    document.getElementById("previewContainer").classList.remove("hidden");
                };
                reader.readAsDataURL(file);
            }
        });
    </script>
@endsection
