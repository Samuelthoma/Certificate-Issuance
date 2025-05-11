@extends('layouts.dashboard') 
@vite(['resources/js/dashboard/index.js', 'resources/js/dashboard/documentCollaborator.js'])
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


<div id="documentHeaderCollaborator" class="text-xl font-bold my-8 hidden">Shared Documents</div>
<div id="noDocument" class="text-xl font-bold italic">You don't have any shared document yet</div>
<div id="documentListCollaborator" class="space-y-4 mt-4"></div>
@endsection
