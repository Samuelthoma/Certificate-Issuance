from flask import Flask, request, jsonify
from ktpocr.extractor import KTPOCR
import os
import tempfile
import traceback
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/extract_ktp', methods=['POST'])
def extract_ktp():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    
    # Save the uploaded file to a temporary location
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
    file.save(temp_file.name)
    temp_file.close()
    
    logger.info(f"Processing image: {temp_file.name}")
    
    try:
        # Process the image with the KTPOCR class
        ktp_ocr = KTPOCR(temp_file.name)
        
        # Get the extracted data
        ktp_data = ktp_ocr.result.__dict__
        
        # Clean up the temporary file
        os.unlink(temp_file.name)
        
        logger.info(f"Successfully processed image, extracted data: {ktp_data}")
        return jsonify(ktp_data)
    except Exception as e:
        # Clean up the temporary file in case of errors
        if os.path.exists(temp_file.name):
            os.unlink(temp_file.name)
        
        # Get full traceback
        error_traceback = traceback.format_exc()
        logger.error(f"Error processing image: {str(e)}\n{error_traceback}")
        
        return jsonify({'error': str(e), 'traceback': error_traceback}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)