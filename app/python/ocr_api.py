from flask import Flask, request, jsonify
import easyocr
import os
import re
from datetime import datetime

app = Flask(__name__)
reader = easyocr.Reader(['id'])  # Supports Indonesian

UPLOAD_FOLDER = 'C:\\Laravel\\Certificate-Issuance\\storage\\app\\private\\temp_id_cards'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Step 1: Perform OCR
def perform_ocr(image_path):
    results = reader.readtext(image_path)
    extracted_text = "\n".join([text[1] for text in results])
    return extracted_text

# Step 2: Extract KTP Info
def extract_ktp_info(text):
    lines = text.strip().split('\n')
    data = {
        "NIK": "Not found",
        "Nama": "Not found",
        "Tanggal Lahir": "Not found"
    }

    nik_pattern = re.compile(r'\b\d{16}\b')
    date_pattern = re.compile(r'(\d{1,2})[-/\s.](\d{1,2})[-/\s.](\d{2,4})')
    
    nik_line_idx = None

    # Find NIK
    for i, line in enumerate(lines):
        if "NIK" in line:
            nik_line_idx = i
            nik_match = nik_pattern.search(line) or (i + 1 < len(lines) and nik_pattern.search(lines[i + 1]))
            if nik_match:
                data["NIK"] = nik_match.group(0)
                nik_line_idx = i + 1 if nik_pattern.search(lines[i + 1]) else i
            break

    if data["NIK"] == "Not found":
        for i, line in enumerate(lines):
            nik_match = nik_pattern.search(line)
            if nik_match:
                data["NIK"] = nik_match.group(0)
                nik_line_idx = i
                break

    # Find Name
    if nik_line_idx is not None:
        for i in range(nik_line_idx + 1, min(nik_line_idx + 5, len(lines))):
            line = lines[i].strip()
            if line == "Nama" and i + 1 < len(lines):
                data["Nama"] = lines[i + 1].strip()
                break
            elif "Nama:" in line or "Nama :" in line:
                data["Nama"] = re.sub(r'Nama\s*:?\s*', '', line).strip()
                break
            elif re.match(r'^[A-Z][A-Z\s\.,]+$', line) and " " in line:
                if len(line.split()) >= 2 and len(line) > 5:
                    data["Nama"] = line
                    break

    # Find Date of Birth
    if nik_line_idx is not None:
        for i in range(nik_line_idx + 1, len(lines)):
            line = lines[i].lower()
            if "lahir" in line or "tgl" in line or "tanggal" in line:
                for j in range(i, min(i + 2, len(lines))):
                    date_match = date_pattern.search(lines[j])
                    if date_match:
                        day, month, year = date_match.groups()
                        if len(year) == 2:
                            current_year = datetime.now().year % 100
                            century = "20" if int(year) <= current_year else "19"
                            year = f"{century}{year}"
                        elif len(year) == 4 and year.startswith("00"):
                            year = "20" + year[2:]
                        data["Tanggal Lahir"] = f"{day.zfill(2)}-{month.zfill(2)}-{year}"
                        break
                if data["Tanggal Lahir"] != "Not found":
                    break

        if data["Tanggal Lahir"] == "Not found":
            for i in range(nik_line_idx + 1, len(lines)):
                date_match = date_pattern.search(lines[i])
                if date_match:
                    day, month, year = date_match.groups()
                    if len(year) == 2:
                        current_year = datetime.now().year % 100
                        century = "20" if int(year) <= current_year else "19"
                        year = f"{century}{year}"
                    elif len(year) == 4 and year.startswith("00"):
                        year = "20" + year[2:]
                    if 1 <= int(day) <= 31 and 1 <= int(month) <= 12:
                        data["Tanggal Lahir"] = f"{day.zfill(2)}-{month.zfill(2)}-{year}"
                        break
    return data

# Flask Route
@app.route('/extract-ktp', methods=['POST'])
def extract_ktp():
    if 'id_card_image' not in request.files:
        return jsonify({"success": False, "message": "No file uploaded"}), 400
    
    file = request.files['id_card_image']
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    try:
        extracted_text = perform_ocr(file_path)
        ktp_info = extract_ktp_info(extracted_text)

        return jsonify({"success": True, "data": ktp_info})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        os.remove(file_path)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)
