from flask import Flask, request, jsonify
import subprocess
import os
import tempfile

app = Flask(__name__)

@app.route('/sign', methods=['POST'])
def sign_pdf():
    try:
        # Extract uploaded files
        document = request.files['document']
        certificate = request.files['certificate']
        signature_data = request.files['signature_data']
        signature_box = request.files['signature_box']
        private_key = request.files['private_key']

        # Use a temporary directory for file handling
        with tempfile.TemporaryDirectory() as temp_dir:
            doc_path = os.path.join(temp_dir, 'document.pdf')
            cert_path = os.path.join(temp_dir, 'certificate.pem')
            sig_data_path = os.path.join(temp_dir, 'signature.dat')
            box_path = os.path.join(temp_dir, 'boxes.json')
            key_path = os.path.join(temp_dir, 'private_key.pem')
            output_path = os.path.join(temp_dir, 'signed.pdf')

            # Save files
            document.save(doc_path)
            certificate.save(cert_path)
            signature_data.save(sig_data_path)
            signature_box.save(box_path)
            private_key.save(key_path)

            # Construct full path to apply_signature.py
            script_path = os.path.join(os.path.dirname(__file__), 'documentsigning', 'apply_signature.py')

            # Call the script
            result = subprocess.run(
                [
                    'python', script_path,
                    doc_path, cert_path, sig_data_path, box_path, output_path, key_path
                ],
                capture_output=True,
                text=True
            )

            if result.returncode != 0:
                return jsonify({
                    'success': False,
                    'error': result.stderr
                }), 500

            with open(output_path, 'rb') as signed_file:
                return signed_file.read(), 200, {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': 'attachment; filename="signed.pdf"'
                }

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(port=5001)
