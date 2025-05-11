@extends('layouts.dashboard') 
@vite(['resources/js/dashboard/index.js'])
@section('content')
<div class="flex justify-between items-center mb-8">
    <button class="md:hidden text-gray-500" onclick="toggleSidebar()">
        <i class="fas fa-bars text-xl"></i>
    </button>
    <div>
        <p class="text-sm text-black font-semibold">
            Welcome back, Glad to see you again!
        </p>
        <h1 class="text-4xl my-2 italic" id="user-email"></h1>
    </div>
</div>
<div class="grid grid-cols-2 gap-4 mb-8">
    <div
        class="bg-blue-200 text-black p-4 flex items-center justify-between border-2 border-r-4 border-b-4 hover:border-r-3 hover:border-b-3 rounded-sm"
    >
        <span class="text-2xl font-bold"> 0 </span>
        <span class="text-sm font-semibold"> Draft </span>
        <i class="fas fa-pencil-alt text-black"> </i>
    </div>
    <div
        class="bg-amber-200 text-black p-4 flex items-center justify-between border-2 border-r-4 border-b-4 hover:border-r-3 hover:border-b-3 rounded-sm"
    >
        <span class="text-2xl font-bold"> 0 </span>
        <span class="text-sm font-semibold"> Pending </span>
        <i class="fas fa-clock text-black"> </i>
    </div>
    <div
        class="bg-green-200 text-black p-4 flex items-center justify-between border-2 border-r-4 border-b-4 hover:border-r-3 hover:border-b-3 rounded-sm"
    >
        <span class="text-2xl font-bold"> 0 </span>
        <span class="text-sm font-semibold"> Completed </span>
        <i class="fas fa-check-square text-black"> </i>
    </div>
    <div
        class="bg-red-200 text-black p-4 flex items-center justify-between border-2 border-r-4 border-b-4 hover:border-r-3 hover:border-b-3 rounded-sm"
    >
        <span class="text-2xl font-bold"> 0 </span>
        <span class="text-sm font-semibold"> Declined </span>
        <i class="fas fa-ban text-black"> </i>
    </div>
</div>
<div class="border-2 border-dashed border-black p-8 text-center">
    <p class="text-sm mb-4">Create your envelope here</p>
    <p class="text-xs text-gray-500 mb-4">Supported files: PDF Only</p>
    <label
        class="flex flex-row items-center p-2 bg-black border-2 border-black rounded-sm shadow-md cursor-pointer w-full lg:w-1/4 justify-center mx-auto"
    >
        <i class="fas fa-cloud-upload-alt mr-2 text-white"></i>
        <span class="text-md ml-2 text-white">Upload & Sign</span>
        <input
            type="file"
            id="uploadInput"
            class="hidden"
            accept="application/pdf"
        />
    </label>
</div>
<div id="documentHeader" class="text-xl font-bold my-8 hidden">Documents</div>
<div id="documentList" class="space-y-4 mt-4"></div>
@endsection
