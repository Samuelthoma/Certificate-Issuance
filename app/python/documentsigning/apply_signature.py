#!/usr/bin/env python3

import sys
import os
import json
import logging
from datetime import datetime
from pyhanko.sign import signers, fields
from pyhanko.pdf_utils import text, images
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign.fields import SigFieldSpec
from pyhanko.sign.signers import SimpleSigner, PdfSignatureMetadata
from pyhanko.sign.signers.pdf_cms import PdfCMSSignedAttributes
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend

# Set up logging to both file and console
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),  # Log to stdout
        logging.FileHandler('signature_app.log')  # Also log to a file
    ]
)
logger = logging.getLogger(__name__)

def apply_signature(input_pdf, cert_path, signature_path, boxes_json_path, output_path, key_path=None):
    """
    Apply digital signatures to a PDF document using pyhanko.
    """
    print(f"Starting to apply signature to {input_pdf}")  # Basic print for debugging
    
    try:
        logger.info(f"Starting to apply signature to {input_pdf}")
        
        # Check if all files exist
        for file_path in [input_pdf, cert_path, signature_path, boxes_json_path]:
            if not os.path.exists(file_path):
                print(f"ERROR: File does not exist: {file_path}")
                logger.error(f"File does not exist: {file_path}")
                return False
        
        print(f"Loading signature boxes from {boxes_json_path}")
        # Load the signature boxes JSON
        with open(boxes_json_path, 'r') as f:
            signature_boxes = json.load(f)
            print(f"Loaded {len(signature_boxes)} signature boxes")
        
        print(f"Loading certificate from {cert_path}")
        # Load the certificate with or without private key
        try:
            signer = SimpleSigner.load(
                cert_file=cert_path,
                key_file=key_path,  # Now this can be None or a path
                key_passphrase=None
            )
            print("Certificate loaded successfully")
        except Exception as e:
            print(f"ERROR loading certificate: {str(e)}")
            logger.error(f"Error loading certificate: {e}")
            return False
        
        print(f"Loading signature data from {signature_path}")
        # Load the signature data
        with open(signature_path, 'rb') as f:
            signature_data = f.read()
            print(f"Loaded {len(signature_data)} bytes of signature data")
        
        print(f"Processing PDF: {input_pdf}")
        # Process the PDF
        with open(input_pdf, 'rb') as in_f:
            try:
                reader = PdfFileReader(in_f)
                w = IncrementalPdfFileWriter(in_f)
                print("PDF loaded successfully")
                
                # Verify PDF structure is accessible
                if reader.root is None:
                    print("ERROR: PDF root dictionary not accessible")
                    logger.error("PDF root dictionary not accessible")
                    return False
                
                if '/Pages' not in reader.root:
                    print("ERROR: PDF has no /Pages entry in root")
                    logger.error("PDF has no /Pages entry in root")
                    return False
                
                # Debugging information
                print(f"PDF structure - Root keys: {list(reader.root.keys())}")
                print(f"PDF Pages dictionary keys: {list(reader.root['/Pages'].keys())}")
                
                # Verify Kids array exists
                if '/Kids' not in reader.root['/Pages']:
                    print("ERROR: PDF has no /Kids array in /Pages")
                    logger.error("PDF has no /Kids array in /Pages")
                    return False
                
                # Get the actual number of pages
                page_count = reader.root['/Pages'].get('/Count', 0)
                print(f"PDF has {page_count} page(s) according to Count entry")
            except Exception as e:
                print(f"ERROR loading PDF: {str(e)}")
                logger.error(f"Error loading PDF: {e}")
                return False
            
            # Initialize signature_meta outside the loop so it exists even if all boxes fail
            signature_meta = None
            
            # Add signature fields for each box
            for idx, box in enumerate(signature_boxes):
                print(f"Processing signature box {idx+1}/{len(signature_boxes)}")
                try:
                    # Parse box position data
                    page_idx = box['page'] - 1  # Convert from 1-based to 0-based
                    box_x = float(box['rel_x'])
                    box_y = float(box['rel_y'])
                    box_width = float(box['rel_width'])
                    box_height = float(box['rel_height'])
                    box_id = box['box_id']
                    
                    # Verify page index is valid
                    if page_idx < 0 or page_idx >= page_count:
                        print(f"ERROR: Page index out of bounds: {page_idx+1}")
                        logger.error(f"Page index out of bounds: {page_idx+1}")
                        continue
                    
                    # Get page dimensions - using safer access methods
                    kids = reader.root['/Pages']['/Kids']
                    if len(kids) <= page_idx:
                        print(f"ERROR: Page index {page_idx} out of range for Kids array (length: {len(kids)})")
                        logger.error(f"Page index {page_idx} out of range for Kids array")
                        continue
                        
                    # Try to access page object safely
                    try:
                        page = reader.root['/Pages']['/Kids'][page_idx]
                        print(f"Successfully accessed page {page_idx}")
                        
                        # Debug page object
                        if page is not None:
                            print(f"Page keys: {list(page.keys()) if hasattr(page, 'keys') else 'No keys method'}")
                        else:
                            print(f"Page object is None")
                            continue
                    except Exception as page_err:
                        print(f"ERROR accessing page {page_idx}: {str(page_err)}")
                        logger.error(f"Error accessing page {page_idx}: {page_err}")
                        continue
                    
                    # Get MediaBox - first from page, then from parent if needed
                    try:
                        if '/MediaBox' in page:
                            media_box = page['/MediaBox']
                        elif '/MediaBox' in reader.root['/Pages']:
                            media_box = reader.root['/Pages']['/MediaBox']
                        else:
                            print(f"No MediaBox found for page {page_idx}, using default")
                            media_box = [0, 0, 612, 792]  # Default letter size
                            
                        print(f"MediaBox for page {page_idx}: {media_box}")
                        
                        page_width = float(media_box[2])
                        page_height = float(media_box[3])
                    except Exception as box_err:
                        print(f"ERROR getting media box: {str(box_err)}")
                        logger.error(f"Error getting media box: {box_err}")
                        continue
                    
                    # Calculate absolute coordinates (pyhanko uses bottom-left origin)
                    abs_x = box_x * page_width
                    abs_y = page_height - (box_y * page_height) - (box_height * page_height)  # Flip Y-axis
                    abs_width = box_width * page_width
                    abs_height = box_height * page_height
                    
                    print(f"Creating signature field at ({abs_x}, {abs_y}) with size ({abs_width}, {abs_height}) on page {page_idx}")
                    # Create a signature field
                    sig_field = fields.SigFieldSpec(
                        sig_field_name=f"Signature{box_id}",
                        box=(abs_x, abs_y, abs_x + abs_width, abs_y + abs_height),
                        on_page=page_idx
                    )
                    
                    # Add field to the PDF
                    fields.append_signature_field(w, sig_field)
                    print(f"Signature field added: Signature{box_id}")
                    
                    # Prepare signature metadata - store for each successful box
                    signature_meta = PdfSignatureMetadata(
                        field_name=f"Signature{box_id}",
                        subfilter=fields.SigSeedSubFilter.PKCS7_DETACHED,
                        cades_signed_attr=PdfCMSSignedAttributes(timestamp_md_algorithm='sha256'),
                        md_algorithm='sha256',
                        reason=f"Digital signature applied using pyhanko",
                        timestamp_info=None,  # No timestamp server in this example
                        contact_info=None,
                        location=None
                    )
                    
                    # Add visual content from the box if it exists
                    content = box.get('content')
                    if content and content.strip():
                        print(f"Adding visual content for signature {box_id}, type: {box.get('type', 'unknown')}")
                        # For typed signatures, add text
                        if box.get('type') == 'typed':
                            w.add_annotation(
                                page_idx,
                                {
                                    '/Type': '/Annot',
                                    '/Subtype': '/FreeText',
                                    '/Rect': [abs_x, abs_y, abs_x + abs_width, abs_y + abs_height],
                                    '/Contents': content,
                                    '/DA': '/Helvetica 12 Tf 0 0 0 rg',  # 12pt Helvetica, black
                                    '/Border': [0, 0, 0],
                                    '/C': [0, 0, 0]  # Black border
                                }
                            )
                        # For drawn signatures, try to add as an image
                        elif box.get('type') == 'drawn' and content.startswith('data:image'):
                            # Handle base64 image data
                            import base64
                            try:
                                # Extract the base64 part
                                img_format, img_data = content.split(';base64,')
                                img_data = base64.b64decode(img_data)
                                
                                # Save as temp image file
                                temp_img_path = os.path.join(os.path.dirname(input_pdf), f"temp_sig_{box_id}.png")
                                with open(temp_img_path, 'wb') as img_file:
                                    img_file.write(img_data)
                                
                                # Add image annotation
                                img_annotation = {
                                    '/Type': '/Annot',
                                    '/Subtype': '/Image',
                                    '/Rect': [abs_x, abs_y, abs_x + abs_width, abs_y + abs_height],
                                    '/Border': [0, 0, 0]
                                }
                                w.add_annotation(page_idx, img_annotation)
                                
                                # Clean up temp file
                                os.unlink(temp_img_path)
                                print(f"Added image signature for box {box_id}")
                            except Exception as e:
                                print(f"ERROR processing signature image: {str(e)}")
                                logger.error(f"Error processing signature image: {e}")
                except Exception as e:
                    print(f"ERROR processing box {idx+1}: {str(e)}")
                    logger.error(f"Error processing box {idx+1}: {e}")
            
            # Check if we have a valid signature metadata
            if signature_meta is None:
                print("ERROR: No valid signature boxes were processed successfully")
                logger.error("No valid signature boxes were processed successfully")
                return False
                
            print("Signing the PDF document...")
            try:
                # Sign the PDF with provided signature data
                out = signers.sign_pdf(
                    w,
                    signature_meta=signature_meta,
                    signer=signer,
                    existing_fields_only=True,
                    in_place=True,
                    appearance_text_params={
                        'signing_date': datetime.now().strftime("%Y.%m.%d %H:%M"),
                        'location': 'Digital Signature',
                        'reason': 'Document Signing'
                    }
                )
                print("PDF signed successfully")
            except Exception as e:
                print(f"ERROR signing PDF: {str(e)}")
                logger.error(f"Error signing PDF: {e}")
                return False
                
            # Write the signed PDF to the output path
            print(f"Writing output to {output_path}")
            try:
                with open(output_path, 'wb') as out_f:
                    out_f.write(w.getbuffer())

                if os.path.exists(output_path):
                    print(f"Output file written successfully: {output_path}")
                    logger.info(f"Output file written successfully: {output_path}")
                else:
                    print(f"ERROR: Output file NOT found at: {output_path}")
                    logger.error(f"Output file NOT found at: {output_path}")
            except Exception as e:
                print(f"ERROR writing output file: {str(e)}")
                logger.error(f"Error writing output file: {e}")
                return False
            
            logger.info(f"Successfully signed PDF, saved to {output_path}")
            return True
            
    except Exception as e:
        print(f"ERROR applying signature: {str(e)}")
        logger.error(f"Error applying signature: {e}")
        return False

def main():
    """
    Main function to run the script from command line
    """
    print(f"Script started with arguments: {sys.argv}")
    
    if len(sys.argv) < 6 or len(sys.argv) > 7:
        print("Usage: python apply_signature.py <input_pdf> <cert_path> <signature_path> <boxes_json_path> <output_path> [key_path]")
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    cert_path = sys.argv[2]
    signature_path = sys.argv[3]
    boxes_json_path = sys.argv[4]
    output_path = sys.argv[5]
    
    # Check if private key path is provided
    key_path = None
    if len(sys.argv) == 7:
        key_path = sys.argv[6]
    
    # Check if all input files exist
    for path, label in [
        (input_pdf, "Input PDF"),
        (cert_path, "Certificate"),
        (signature_path, "Signature data"),
        (boxes_json_path, "Signature boxes JSON"),
    ]:
        if not os.path.exists(path):
            print(f"ERROR: {label} file not found: {path}")
            sys.exit(1)
    
    if key_path and not os.path.exists(key_path):
        print(f"ERROR: Private key file not found: {key_path}")
        sys.exit(1)
        
    print("All input files exist, proceeding with signature application")
    
    result = apply_signature(input_pdf, cert_path, signature_path, boxes_json_path, output_path, key_path)
    
    if result:
        print("Signature applied successfully!")
        sys.exit(0)
    else:
        print("Failed to apply signature.")
        sys.exit(1)

if __name__ == "__main__":
    main()