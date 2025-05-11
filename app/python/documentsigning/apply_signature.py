import sys
import json
import base64
import os
from pathlib import Path
import pikepdf
from PIL import Image
from pyhanko.sign import signers
from pyhanko.sign.signers import PdfSigner, PdfSignatureMetadata
from pyhanko.stamp import TextStampStyle
from pyhanko.pdf_utils.images import PdfImage
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.sign.fields import SigFieldSpec, append_signature_field
from pyhanko.pdf_utils.layout import SimpleBoxLayoutRule, AxisAlignment, InnerScaling, Margins
from pyhanko.pdf_utils.text import TextBoxStyle

# ====== Get input arguments ======
# Required:
# 1. input_pdf_path
# 2. cert_file
# 3. signature_image_path (decoded from base64 by controller)
# 4. boxes_json_path
# 5. output_pdf_path
# Optional:
# 6. private_key_path

if len(sys.argv) < 6:
    print("Usage: python apply_signature.py <input_pdf> <cert_file> <signature_image> <boxes_json> <output_pdf> [<private_key>]")
    sys.exit(1)

input_pdf_path = sys.argv[1]
cert_file = sys.argv[2]
signature_image_path = sys.argv[3]
boxes_json_path = sys.argv[4]
output_pdf_path = sys.argv[5]
private_key_path = sys.argv[6] if len(sys.argv) > 6 else None

# ====== Parse boxes.json ======
with open(boxes_json_path, "r") as f:
    boxes_data = json.load(f)

def parse_signature_box(json_data):
    data = json_data[0]
    signature_image = None
    if 'content' in data and data['content'].startswith('data:image'):
        img_data = data['content'].split(',')[1]
        signature_image = base64.b64decode(img_data)
    return {
        'page': data['page'],
        'x': data['rel_x'],
        'y': data['rel_y'],
        'width': data['rel_width'],
        'height': data['rel_height'],
        'image': signature_image,
        'box_id': data['box_id']
    }

sig_box = parse_signature_box(boxes_data)

# Save image to PNG via Pillow
temp_img_path = Path(signature_image_path)
if sig_box["image"]:
    temp_img_path.write_bytes(sig_box["image"])
    with Image.open(temp_img_path) as img:
        pil_image = img.convert("RGBA")
        background_image = PdfImage(pil_image)

# Calculate absolute coordinates
with pikepdf.open(input_pdf_path) as pdf:
    page_obj = pdf.pages[sig_box['page'] - 1]
    media_box = page_obj.get('/MediaBox', [0, 0, 612, 792])
    page_width = float(media_box[2])
    page_height = float(media_box[3])

x1 = sig_box['x'] * page_width
y1 = (1 - sig_box['y'] - sig_box['height']) * page_height
x2 = (sig_box['x'] + sig_box['width']) * page_width
y2 = (1 - sig_box['y']) * page_height

if x1 == x2:
    x2 += 100
if y1 == y2:
    y2 += 50

field_name = sig_box['box_id']
field_spec = SigFieldSpec(sig_field_name=field_name, box=(x1, y1, x2, y2), on_page=sig_box['page'] - 1)

# Load signer
signer = signers.SimpleSigner.load(
    cert_file=cert_file,
    key_file=private_key_path if private_key_path else cert_file,
    key_passphrase=None
)

# Use full layout rule with default margins to avoid error
stamp_style = TextStampStyle(
    stamp_text="",  # Optional text
    background=background_image,
    background_layout=SimpleBoxLayoutRule(
        x_align=AxisAlignment.ALIGN_MID,
        y_align=AxisAlignment.ALIGN_MID,
        margins=Margins(left=0, right=0, top=0, bottom=0),
        inner_content_scaling=InnerScaling.STRETCH_FILL
    ),
    background_opacity=1.0,
    text_box_style=TextBoxStyle(
        font_size=10,
        border_width=0
    )
)

# Append signature field and sign
with open(input_pdf_path, "rb+") as doc_stream:
    writer = IncrementalPdfFileWriter(doc_stream)
    append_signature_field(writer, field_spec)

    pdf_signer = PdfSigner(
        signature_meta=PdfSignatureMetadata(field_name=field_name),
        signer=signer,
        stamp_style=stamp_style,
    )

    with open(output_pdf_path, "wb") as outf:
        pdf_signer.sign_pdf(writer, output=outf)

print(f" Signature applied successfully.")
print(f" Signed PDF saved at: {os.path.abspath(output_pdf_path)}")

# Clean up temp image
try:
    if temp_img_path.exists():
        os.remove(temp_img_path)
        print(f" Temporary signature image removed: {temp_img_path}")
except PermissionError:
    print(f" Warning: Could not remove temp image; file may still be in use: {temp_img_path}")

