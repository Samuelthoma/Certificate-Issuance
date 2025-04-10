@extends('layouts.app')

@section('content')
<div class="container">
    <div class="row justify-content-center">
        <div class="col-md-8">
            <div class="card">
                <div class="card-header">Debug Key Encryption/Decryption</div>

                <div class="card-body">
                    <form id="debugForm">
                        @csrf
                        <div class="form-group">
                            <label for="password">Enter Password to Decrypt</label>
                            <input type="password" class="form-control" id="password" name="password" required>
                        </div>
                        <button type="submit" class="btn btn-primary mt-3">Test Decryption</button>
                    </form>

                    <div class="mt-4">
                        <h5>Results:</h5>
                        <div id="results" class="p-3 border rounded bg-light">
                            <p>Enter your password above and click "Test Decryption" to verify the encryption/decryption process.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
document.getElementById('debugForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    const resultsDiv = document.getElementById('results');
    
    fetch('{{ route("debug.keys") }}', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('input[name="_token"]').value
        },
        body: JSON.stringify({ password: password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let html = `
                <div class="${data.matches_original ? 'text-success' : 'text-danger'}">
                    <strong>Keys Match: ${data.matches_original ? 'YES ✓' : 'NO ✗'}</strong>
                </div>
                <div class="mt-3">
                    <strong>Public Key Preview:</strong>
                    <pre class="mt-2">${data.public_key.substring(0, 100)}...</pre>
                </div>
                <div class="mt-3">
                    <strong>Decrypted Private Key Preview:</strong>
                    <pre class="mt-2">${data.decrypted_key_preview}</pre>
                </div>
                <div class="mt-3">
                    <strong>Original Private Key Preview:</strong>
                    <pre class="mt-2">${data.original_key_preview}</pre>
                </div>
            `;
            resultsDiv.innerHTML = html;
        } else {
            resultsDiv.innerHTML = `<div class="text-danger">${data.message}</div>`;
        }
    })
    .catch(error => {
        resultsDiv.innerHTML = `<div class="text-danger">Error: ${error.message}</div>`;
    });
});
</script>
@endsection