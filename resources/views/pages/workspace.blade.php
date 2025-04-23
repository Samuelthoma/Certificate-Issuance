<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Document Workspace</title>
    @vite(['resources/css/app.css', 'resources/js/workspace.js', 'resources/js/signature.js'])
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- PDF.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.min.js"></script>

    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" rel="stylesheet" />
    
    <style>
        /* Styles for signature boxes and handles */
        .signature-box {
            min-width: 100px;
            min-height: 40px;
        }
        
        .resize-handle {
            z-index: 20;
        }
        
        /* Handle hover effect */
        .resize-handle:hover {
            background-color: #3b82f6;
        }
        
        /* Signature toolbar items */
        .signature-toolbar-item {
            cursor: grab;
            transition: all 0.2s;
        }
        
        .signature-toolbar-item:active {
            cursor: grabbing;
        }
    </style>
    <script>
        // Set up the pdfjsLib global
        window.pdfjsLib = window['pdfjs-dist/build/pdf'];
        
        // Enable compatibility with web workers
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js';
    </script>
</head>
<body class="h-screen font-sans bg-gray-50 text-gray-900 select-none overflow-hidden" data-document-id="{{ $documentId }}">

    <!-- Header with controls -->
    <header class="h-16 flex items-center px-8 bg-white border-b shadow justify-between">
        <div class="flex items-center">
            <img src="{{ asset('images/logo.png') }}" alt="Logo" height="45" width="45" />
            <span class="ml-2 font-bold text-xl">Clarisign</span>
        </div>
        <div id="pdf-controls" class="flex items-center gap-4">
            <ul class="flex justify-center gap-4 text-gray-900">
                <li>
                    <button id="zoom-out" aria-label="Zoom Out" class="grid size-9 place-content-center rounded border bg-white border-gray-300 transition-colors hover:bg-gray-200">
                        −
                    </button>
                </li>

                <li>
                    <button id="prev-page" aria-label="Previous page" class="grid size-9 place-content-center rounded border bg-white border-gray-300 transition-colors hover:bg-gray-200 disabled:opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </li>

                <li class="flex items-center text-sm font-medium tracking-widest">
                    <span id="page-num">1</span>/<span id="page-count">1</span>
                </li>

                <li>
                    <button id="next-page" aria-label="Next page" class="grid size-9 place-content-center rounded border border-gray-300 bg-white transition-colors hover:bg-gray-200 disabled:opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </li>

                <li>
                    <button id="zoom-in" aria-label="Zoom In" class="grid size-9 place-content-center rounded border border-gray-300 bg-white transition-colors hover:bg-gray-200">
                        +
                    </button>
                </li>
            </ul>
        </div>
    </header>

    <div class="flex h-full overflow-hidden">
        <div class="w-1/4 bg-white p-8">
            <!-- Document Details -->
            <h1 class="text-2xl font-semibold mb-6">Document Preview</h1>
            <label class="font-bold">Document Name</label>
            <p class="text-gray-500 mb-4 truncate" id="document-name"></p>

            <label class="font-bold">Recipients</label>
            <div class="flex border-2 font-semibold my-4 ">
                <input type="email" id="recipient-email" class="w-5/6 focus:outline-none py-2 px-2" placeholder="Add Recipient" />
                <button class="w-1/6 border-l-2 hover:bg-gray-200"><i class="fas fa-user"></i></button>
            </div>

            <label class="font-bold">Signature</label>
            <div class="flex gap-2.5 my-4">
                <div id="drawn-signature" class="signature-toolbar-item flex w-1/2 bg-white hover:bg-gray-200 border-2 py-2 font-semibold items-center justify-center" data-type="drawn">
                    <i class="fas fa-signature mr-2"></i>Drawn
                </div>

                <div id="typed-signature" class="signature-toolbar-item flex w-1/2 bg-white hover:bg-gray-200 border-2 py-2 font-semibold items-center justify-center" data-type="typed">
                    <i class="fas fa-font mr-2"></i>Typed
                </div>
            </div>

            <label class="font-bold">Download</label>
            <button id="download-btn" class="w-full bg-white hover:bg-gray-200 border-2 font-semibold py-2 px-4 my-4">
                <i class="fas fa-download mr-2"></i>Download File
            </button>

            <label class="font-bold">Save</label>
            <button id="save-btn" class="w-full bg-white hover:bg-gray-200 border-2 font-semibold py-2 px-4 my-4">
                <i class="fas fa-save mr-2"></i>Save Draft
            </button>

            <label class="font-bold">Finalize</label>
            <button id="save-btn" class="w-full bg-white hover:bg-gray-200 border-2 font-semibold py-2 px-4 my-4">
                <i class="fas fa-check-circle mr-2"></i>Finalize Document
            </button>
        </div>

        <div class="w-3/4 py-4 overflow-auto h-full">
            <!-- PDF Canvas Area -->
            <div class="flex justify-center mb-4">
                <div class="relative flex justify-center mb-4">
                    <canvas id="pdf-canvas" class="border border-gray-300 rounded shadow-lg" width="595" height="842"></canvas>

                    <div id="canvasOverlay" class="absolute top-0 left-0 z-10 pointer-events-none cursor-default"></div>
                </div>
            </div>

            <!-- Signature Modals -->
            <div id="typedSignatureModal" class="fixed inset-0 bg-black/70 items-center justify-center z-50 hidden">
                <div class="bg-white p-6 rounded shadow-xl w-96">
                    <h2 class="text-xl font-semibold mb-4">Type Your Signature</h2>
                    <textarea id="typedInput" class="w-full border p-2 rounded mb-4" placeholder="Type your name..."></textarea>
                    <div class="flex justify-end space-x-2">
                        <button class="px-4 py-2 bg-gray-300 rounded modal-cancel">Cancel</button>
                        <button id="applyTyped" class="px-4 py-2 bg-blue-500 text-white rounded">Apply</button>
                    </div>
                </div>
            </div>

            <div id="drawnSignatureModal" class="fixed inset-0 bg-black/70 items-center justify-center z-50 hidden">
                <div class="bg-white p-6 rounded shadow-xl w-96">
                    <h2 class="text-xl font-semibold mb-4">Draw Your Signature</h2>
                    <canvas id="drawCanvas" width="300" height="100" class="border mb-4"></canvas>
                    <div class="flex justify-between mb-2">
                        <button id="clearCanvas" class="px-3 py-1 bg-gray-200 rounded">Clear</button>
                    </div>
                    <div class="flex justify-end space-x-2">
                        <button class="px-4 py-2 bg-gray-300 rounded modal-cancel">Cancel</button>
                        <button id="applyDrawn" class="px-4 py-2 bg-blue-500 text-white rounded">Apply</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>