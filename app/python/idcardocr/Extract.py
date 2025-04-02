import easyocr
import re
import sys
from datetime import datetime

# Step 1: Perform OCR with EasyOCR
def perform_ocr(image_path):
    reader = easyocr.Reader(['id'])  # Supports Indonesian 
    results = reader.readtext(image_path)
    
    extracted_text = "\n".join([text[1] for text in results])
    return extracted_text

# Step 2: Extract Key KTP Information with a more focused approach
def extract_ktp_info(text):
    lines = text.strip().split('\n')
    data = {
        "NIK": "Not found",
        "Nama": "Not found",
        "Tanggal Lahir": "Not found"
    }
    
    # Find NIK pattern (16-digit number)
    nik_pattern = re.compile(r'\b\d{16}\b')
    
    # Date patterns (various formats)
    date_pattern = re.compile(r'(\d{1,2})[-/\s.](\d{1,2})[-/\s.](\d{2,4})')
    
    nik_line_idx = None
    
    # First pass: Find NIK and its position
    for i, line in enumerate(lines):
        # Look for NIK line identifier
        if "NIK" in line:
            nik_line_idx = i
            
            # Try to find NIK in this line or next line
            nik_match = nik_pattern.search(line)
            if nik_match:
                data["NIK"] = nik_match.group(0)
            elif i + 1 < len(lines):
                nik_match = nik_pattern.search(lines[i + 1])
                if nik_match:
                    data["NIK"] = nik_match.group(0)
                    nik_line_idx = i + 1  # Update the NIK line to the actual line with the NIK
            
            break
    
    # If NIK still not found, scan all lines for a 16-digit number
    if data["NIK"] == "Not found":
        for i, line in enumerate(lines):
            nik_match = nik_pattern.search(line)
            if nik_match:
                data["NIK"] = nik_match.group(0)
                nik_line_idx = i
                break
    
    # Only proceed if we found a NIK
    if nik_line_idx is not None:
        # Look for the name AFTER the NIK line
        for i in range(nik_line_idx + 1, min(nik_line_idx + 5, len(lines))):
            line = lines[i].strip()
            
            # Look for a line with "Nama" which should be followed by the actual name
            if line == "Nama" and i + 1 < len(lines):
                data["Nama"] = lines[i + 1].strip()
                break
            # Or a line that contains "Nama:" followed by the name
            elif "Nama:" in line or "Nama :" in line:
                # Extract everything after "Nama:" or "Nama :"
                name_part = re.sub(r'Nama\s*:?\s*', '', line).strip()
                if name_part:
                    data["Nama"] = name_part
                break
            # Or just look for all caps names typical in Indonesian KTPs (at least 2 words, all uppercase)
            elif re.match(r'^[A-Z][A-Z\s\.,]+$', line) and " " in line:
                # Make sure it's not just a header
                if len(line.split()) >= 2 and len(line) > 5:
                    data["Nama"] = line
                    break
        
        # Look for date of birth AFTER the NIK line
        for i in range(nik_line_idx + 1, len(lines)):
            line = lines[i].lower()
            
            # Check if this is a line with date of birth reference
            if "lahir" in line or "tgl" in line or "tanggal" in line:
                # Look in this line and the next for a date
                for j in range(i, min(i + 2, len(lines))):
                    date_match = date_pattern.search(lines[j])
                    if date_match:
                        day, month, year = date_match.groups()
                        
                        # Ensure 4-digit year (fix the 0004 issue)
                        if len(year) == 2:
                            # Assume 20XX for years less than current year, 19XX otherwise
                            current_year = datetime.now().year % 100
                            century = "20" if int(year) <= current_year else "19"
                            year = f"{century}{year}"
                        elif len(year) == 4 and year.startswith("00"):
                            # Fix years like 0004 to 2004
                            year = "20" + year[2:]
                        
                        data["Tanggal Lahir"] = f"{day.zfill(2)}-{month.zfill(2)}-{year}"
                        print(f"✅ Date Found: {data['Tanggal Lahir']} (Line {j})")
                        break
                
                # If we found a date, break the loop
                if data["Tanggal Lahir"] != "Not found":
                    break
        
        # If no date found with the above method, scan remaining lines for date patterns
        if data["Tanggal Lahir"] == "Not found":
            for i in range(nik_line_idx + 1, len(lines)):
                date_match = date_pattern.search(lines[i])
                if date_match:
                    day, month, year = date_match.groups()
                    
                    # Ensure 4-digit year
                    if len(year) == 2:
                        current_year = datetime.now().year % 100
                        century = "20" if int(year) <= current_year else "19"
                        year = f"{century}{year}"
                    elif len(year) == 4 and year.startswith("00"):
                        year = "20" + year[2:]
                    
                    # Basic validation
                    if 1 <= int(day) <= 31 and 1 <= int(month) <= 12:
                        data["Tanggal Lahir"] = f"{day.zfill(2)}-{month.zfill(2)}-{year}"
                        print(f"✅ Date Found: {data['Tanggal Lahir']} (Line {i})")
                        break
    return data

# Main Execution
if __name__ == "__main__":
    # Check if an image path was provided as a command-line argument
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        image_path = "ktpsam.jpg"  # Fallback to default
        print("No image path provided, using default: test.jpg")

    print("\n🔍 Performing OCR...")
    extracted_text = perform_ocr(image_path)
    print("\n📜 Extracted Text:\n", extracted_text)

    print("\n📌 Extracting KTP Information...")
    ktp_info = extract_ktp_info(extracted_text)

    print("\n✅ Final Extracted Data:")
    for key, value in ktp_info.items():
        print(f"{key}: {value}")