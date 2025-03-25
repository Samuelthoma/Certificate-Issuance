import cv2
import json
import re
import numpy as np
import pytesseract
import matplotlib.pyplot as plt
from ktpocr.form import KTPInformation
from PIL import Image
import os

class KTPOCR(object):
    def __init__(self, image):
        self.image = cv2.imread(image)
        
        # Cek apakah image berhasil dibaca
        if self.image is None:
            raise ValueError(f"Gagal membaca gambar dari path: {image}")
            
        # Simpan gambar original untuk referensi
        self.original = self.image.copy()
        
        # Preprocessing yang lebih baik
        self.preprocess_image()
        
        # Buat folder output jika belum ada
        os.makedirs("output", exist_ok=True)
        
        # Simpan gambar hasil preprocessing
        cv2.imwrite("output/gray_image.png", self.gray)
        cv2.imwrite("output/threshed_image.png", self.threshed)
        cv2.imwrite("output/blurred_image.png", self.blurred)
        cv2.imwrite("output/adaptive_thresh.png", self.adaptive_thresh)
        
        self.result = KTPInformation()
        self.master_process()

    def preprocess_image(self):
        # 1. Grayscale conversion
        self.gray = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)
        
        # 2. Gaussian Blur untuk mengurangi noise
        self.blurred = cv2.GaussianBlur(self.gray, (5, 5), 0)
        
        # 3. Adaptive Thresholding yang lebih baik untuk pencahayaan tidak merata
        self.adaptive_thresh = cv2.adaptiveThreshold(
            self.blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        # 4. Simpan juga threshold sederhana untuk backup
        self.th, self.threshed = cv2.threshold(self.gray, 127, 255, cv2.THRESH_TRUNC)
        
        # 5. Noise removal dengan morphological operations
        kernel = np.ones((1, 1), np.uint8)
        self.opening = cv2.morphologyEx(self.adaptive_thresh, cv2.MORPH_OPEN, kernel)
        cv2.imwrite("output/opening.png", self.opening)

    def process(self, image):
        # Gunakan konfigurasi pytesseract yang optimal
        custom_config = r'--oem 3 --psm 6 -l ind'
        
        # Coba beberapa metode preprocessing dan ambil yang terbaik
        results = []
        
        # 1. Adaptive threshold
        text1 = pytesseract.image_to_string(self.adaptive_thresh, config=custom_config)
        results.append(text1)
        
        # 2. Opening morphology
        text2 = pytesseract.image_to_string(self.opening, config=custom_config)
        results.append(text2)
        
        # 3. Threshold biasa
        text3 = pytesseract.image_to_string(self.threshed, config=custom_config)
        results.append(text3)
        
        # Pilih hasil dengan kualitas terbaik (yang mengandung keyword penting)
        best_text = text1  # default
        keywords = ["NIK", "Nama", "Tempat", "Lahir", "Alamat"]
        
        # Pilih teks dengan keyword terbanyak
        max_keywords = 0
        for text in results:
            count = sum(1 for keyword in keywords if keyword in text)
            if count > max_keywords:
                max_keywords = count
                best_text = text
        
        return best_text

    def detect_and_process_roi(self):
        """Deteksi dan proses Region of Interest utama pada KTP"""
        height, width = self.gray.shape
        
        # ROI untuk area data (perkiraan lokasi)
        roi_data = self.gray[int(height*0.2):int(height*0.8), int(width*0.3):int(width*0.95)]
        
        # Proses ROI khusus untuk area NIK
        roi_nik = self.gray[int(height*0.15):int(height*0.25), int(width*0.4):int(width*0.95)]
        
        # ROI khusus untuk alamat
        roi_alamat = self.gray[int(height*0.3):int(height*0.45), int(width*0.4):int(width*0.95)]
        
        # Simpan ROI untuk debugging
        cv2.imwrite("output/roi_data.png", roi_data)
        cv2.imwrite("output/roi_nik.png", roi_nik)
        cv2.imwrite("output/roi_alamat.png", roi_alamat)
        
        # OCR khusus untuk NIK dengan konfigurasi digit
        nik_config = r'--oem 3 --psm 7 -l ind -c tessedit_char_whitelist=0123456789'
        nik_text = pytesseract.image_to_string(roi_nik, config=nik_config)
        
        # OCR khusus untuk alamat
        alamat_config = r'--oem 3 --psm 6 -l ind'
        alamat_text = pytesseract.image_to_string(roi_alamat, config=alamat_config)
        
        return nik_text, alamat_text

    def reverse_number_to_letter(self, word):
        """Mengembalikan karakter angka ke huruf pada konteks kata/alamat"""
        word_dict = {
            '8': "B",  # Perbalik dari B ke 8
            '1': "I",  # Perbalik dari I ke 1
            '0': "O",  # Perbalik dari O ke 0
            '6': "b",  # Perbalik dari b ke 6
        }
        
        # Hanya lakukan penggantian jika bukan dalam konteks angka
        result = ""
        pattern = r'\b[A-Za-z]{1,}\d{1,3}[A-Za-z]{1,}\b|\b[A-Za-z]+\b'
        
        # Temukan semua kata dalam string
        for part in re.finditer(pattern, word):
            word_part = part.group(0)
            start, end = part.span()
            
            # Ganti angka dengan huruf dalam kata
            for k, v in word_dict.items():
                word_part = word_part.replace(k, v)
            
            # Update result
            if result:
                result += word[:start - len(result)] + word_part
            else:
                result += word[:start] + word_part
        
        # Tambahkan sisa string jika ada
        if not result:
            return word
        elif len(result) < len(word):
            result += word[len(result):]
        
        return result

    def word_to_number_converter(self, word):
        word_dict = {
            '|' : "1",
            'I' : "1",
            'l' : "1",
            'O' : "0",
            'o' : "0",
            'D' : "0",
            'S' : "5",
            'B' : "8",
            'b' : "6",
            'e' : "2",
            'Z' : "2"
        }
        res = ""
        for letter in word:
            if letter in word_dict:
                res += word_dict[letter]
            else:
                res += letter
        return res

    def nik_extract(self, word):
        # Konversi karakter yang sering salah baca pada NIK
        word = self.word_to_number_converter(word)
        
        # Hapus semua karakter non-digit
        digits_only = re.sub(r'\D', '', word)
        
        # NIK Indonesia harus 16 digit
        if len(digits_only) >= 16:
            return digits_only[:16]  # Potong jika lebih dari 16
        
        return digits_only
    
    def clean_alamat(self, alamat_text):
        """Membersihkan dan memperbaiki deteksi alamat"""
        # Hapus keyword RT/RW dari alamat
        alamat_clean = re.sub(r'RT\s*[:/]?\s*\d+\s*/\s*RW\s*[:/]?\s*\d+', '', alamat_text)
        alamat_clean = re.sub(r'RW\s*[:/]?\s*\d+\s*/\s*RT\s*[:/]?\s*\d+', '', alamat_clean)
        alamat_clean = re.sub(r'RTRW\s*[:/]?\s*\d+\s*/\s*\d+', '', alamat_clean)
        
        # Hapus keyword Alamat jika ada
        alamat_clean = re.sub(r'^Alamat\s*[:/]?\s*', '', alamat_clean)
        
        # Hapus karakter non-printable dan non-alamat
        alamat_clean = re.sub(r'[^\w\s,./-]', '', alamat_clean)
        
        # Perbaiki karakter angka yang harusnya huruf pada nama tempat
        alamat_clean = self.reverse_number_to_letter(alamat_clean)
        
        # Hapus multiple spaces
        alamat_clean = re.sub(r'\s+', ' ', alamat_clean).strip()
        
        return alamat_clean
        
    def extract(self, extracted_result):
        # Fix for SyntaxWarning: invalid escape sequence '\-'
        # Format tanggal yang lebih presisi: DD-MM-YYYY
        date_pattern = r"(\d{1,2}[-\.\/\s]{1,2}\d{1,2}[-\.\/\s]{1,2}\d{4})"
        
        # Coba deteksi NIK dan alamat dari ROI
        nik_from_roi, alamat_from_roi = self.detect_and_process_roi()
        
        # Proses NIK dari ROI
        if nik_from_roi and re.search(r"\d{16}", nik_from_roi):
            self.result.nik = re.search(r"\d{16}", nik_from_roi).group(0)
        
        # Proses alamat dari ROI
        alamat_clean = self.clean_alamat(alamat_from_roi)
        if alamat_clean:
            self.result.alamat = alamat_clean
        
        for word in extracted_result.split("\n"):
            # NIK extraction
            if "NIK" in word:
                try:
                    # Jika NIK sudah terdeteksi dari ROI dan valid, gunakan itu
                    if hasattr(self.result, 'nik') and self.result.nik and len(self.result.nik) == 16:
                        continue
                        
                    word_parts = word.split(':')
                    if len(word_parts) > 1:
                        nik_raw = word_parts[-1].replace(" ", "")
                        nik_processed = self.nik_extract(nik_raw)
                        
                        # Verifikasi panjang NIK
                        if len(nik_processed) == 16:
                            self.result.nik = nik_processed
                except IndexError:
                    self.result.nik = ""
                continue

            # Nama extraction
            if "Nama" in word:
                try:
                    word_parts = word.split(':')
                    if len(word_parts) > 1:
                        self.result.nama = word_parts[-1].replace('Nama ','').strip()
                except IndexError:
                    self.result.nama = ""
                continue

            # Tempat/Tanggal Lahir extraction
            if "Tempat" in word or "Lahir" in word:
                try:
                    word_parts = word.split(':')
                    if len(word_parts) > 1:
                        match = re.search(date_pattern, word_parts[-1])
                        if match:
                            # Normalisasi format tanggal
                            raw_date = match.group(0)
                            # Konversi berbagai pemisah tanggal ke format standar DD-MM-YYYY
                            date_parts = re.split(r'[-\.\/\s]', raw_date)
                            if len(date_parts) == 3:
                                # Pastikan format 2 digit untuk hari dan bulan
                                day = date_parts[0].zfill(2)
                                month = date_parts[1].zfill(2)
                                year = date_parts[2]
                                self.result.tanggal_lahir = f"{day}-{month}-{year}"
                                # Bersihkan tempat lahir dari karakter aneh
                                tempat_bersih = re.sub(r'[^\w\s,]', '', word_parts[-1].replace(raw_date, ''))
                                self.result.tempat_lahir = tempat_bersih.strip()
                            else:
                                self.result.tanggal_lahir = raw_date
                                self.result.tempat_lahir = word_parts[-1].replace(raw_date, '').strip()
                        else:
                            self.result.tanggal_lahir = ""
                            self.result.tempat_lahir = word_parts[-1].strip()
                except (IndexError, AttributeError):
                    self.result.tanggal_lahir = ""
                    self.result.tempat_lahir = ""
                continue

            # Jenis Kelamin and Golongan Darah extraction
            if 'Darah' in word or 'Kelamin' in word:
                try:
                    match = re.search(r"(LAKI-LAKI|LAKI|LELAKI|PEREMPUAN)", word, re.IGNORECASE)
                    if match:
                        self.result.jenis_kelamin = match.group(0).upper()
                    else:
                        self.result.jenis_kelamin = ""
                        
                    # Ekstrak golongan darah
                    word_parts = word.split(':')
                    if len(word_parts) > 1:
                        # Coba temukan golongan darah yang valid
                        match = re.search(r"(O|A|B|AB)[\+\-]?", word_parts[-1], re.IGNORECASE)
                        if match:
                            self.result.golongan_darah = match.group(0).upper()
                        else:
                            # Jika tidak ditemukan golongan darah yang valid, periksa apakah ada tanda "-"
                            if "-" in word_parts[-1] or "_" in word_parts[-1] or "—" in word_parts[-1]:
                                self.result.golongan_darah = "-"
                            else:
                                self.result.golongan_darah = "-"  # Default ke "-" jika tidak jelas
                except (IndexError, AttributeError):
                    self.result.golongan_darah = "-"
                    
            # Alamat extraction - jika belum ada dari ROI
            if 'Alamat' in word and not (hasattr(self.result, 'alamat') and self.result.alamat):
                try:
                    alamat_raw = word.replace("Alamat ", "").replace("Alamat: ", "").strip()
                    self.result.alamat = self.clean_alamat(alamat_raw)
                except Exception:
                    self.result.alamat = ""
                    
            # RT/RW extraction
            if ("RT" in word or "RW" in word) and ("/" in word):
                try:
                    # Hapus semua karakter kecuali digit dan slash untuk RT/RW
                    rt_rw_pattern = r'RT\s*[:/]?\s*(\d+)\s*/\s*RW\s*[:/]?\s*(\d+)'
                    alt_pattern = r'RTRW\s*[:/]?\s*(\d+)\s*/\s*(\d+)'
                    
                    rt_rw_match = re.search(rt_rw_pattern, word)
                    if rt_rw_match:
                        self.result.rt = rt_rw_match.group(1).strip()
                        self.result.rw = rt_rw_match.group(2).strip()
                    else:
                        alt_match = re.search(alt_pattern, word)
                        if alt_match:
                            self.result.rt = alt_match.group(1).strip()
                            self.result.rw = alt_match.group(2).strip()
                        else:
                            # Fallback ke cara lama
                            rt_rw = re.sub(r'[^\d/]', '', word)
                            if "/" in rt_rw:
                                word_parts = rt_rw.split('/')
                                if len(word_parts) > 1:
                                    self.result.rt = word_parts[0].strip()
                                    self.result.rw = word_parts[1].strip()
                except IndexError:
                    pass
                    
            # Kecamatan extraction
            if "Kecamatan" in word:
                try:
                    word_parts = word.split(':')
                    if len(word_parts) > 1:
                        self.result.kecamatan = word_parts[1].strip()
                    else:
                        # Jika tidak ada ':', coba ekstrak dengan cara lain
                        self.result.kecamatan = word.replace("Kecamatan", "").strip()
                except IndexError:
                    self.result.kecamatan = ""
                    
            # Desa extraction
            if "Desa" in word or "Kelurahan" in word:
                try:
                    wrd = word.split()
                    desa = []
                    for wr in wrd:
                        if not ('desa' in wr.lower() or 'kelurahan' in wr.lower()):
                            desa.append(wr)
                    self.result.kelurahan_atau_desa = ' '.join(desa).strip()
                except Exception:
                    self.result.kelurahan_atau_desa = ""
                    
            # Kewarganegaraan extraction
            if 'Kewarganegaraan' in word:
                try:
                    word_parts = word.split(':')
                    if len(word_parts) > 1:
                        self.result.kewarganegaraan = word_parts[1].strip()
                    else:
                        # Jika tidak ada ':', coba ekstrak dengan cara lain
                        self.result.kewarganegaraan = word.replace("Kewarganegaraan", "").strip()
                        # Default ke WNI jika tidak terdeteksi dengan baik
                        if not self.result.kewarganegaraan:
                            self.result.kewarganegaraan = "WNI"
                except IndexError:
                    self.result.kewarganegaraan = "WNI"  # Default ke WNI
                    
            # Pekerjaan extraction
            if 'Pekerjaan' in word:
                try:
                    word_parts = word.split(':')
                    if len(word_parts) > 1:
                        self.result.pekerjaan = word_parts[1].strip()
                    else:
                        # Jika tidak ada ':', coba ekstrak dengan cara lain
                        wrod = word.split()
                        pekerjaan = []
                        for wr in wrod:
                            if not '-' in wr and not 'pekerjaan' in wr.lower():
                                pekerjaan.append(wr)
                        self.result.pekerjaan = ' '.join(pekerjaan).strip()
                except Exception:
                    self.result.pekerjaan = ""
                    
            # Agama extraction
            if 'Agama' in word:
                try:
                    # Ekstrak agama
                    agama_text = word.replace('Agama', "").replace(":", "").strip()
                    
                    # Normalisasi agama
                    agama_mapping = {
                        'islam': 'ISLAM',
                        'kristen': 'KRISTEN',
                        'katolik': 'KATOLIK',
                        'hindu': 'HINDU',
                        'budha': 'BUDDHA',  # Koreksi ke BUDDHA dengan dua D
                        'buddha': 'BUDDHA',
                        'budh': 'BUDDHA',   # Tambahan untuk kesalahan pengenalan
                        'konghucu': 'KONGHUCU',
                        'khonghucu': 'KONGHUCU'
                    }
                    
                    # Koreksi agama
                    self.result.agama = agama_text
                    for key, value in agama_mapping.items():
                        if key in agama_text.lower():
                            self.result.agama = value
                            break
                except Exception:
                    self.result.agama = ""
                    
            # Status Perkawinan extraction
            if 'Perkawinan' in word or 'Kawin' in word:
                try:
                    word_parts = word.split(':')
                    if len(word_parts) > 1:
                        status_raw = word_parts[1].strip()
                        # Bersihkan angka di akhir status
                        self.result.status_perkawinan = re.sub(r'\d+$', '', status_raw).strip()
                    else:
                        # Cek status perkawinan dengan regex
                        status_match = re.search(r'(KAWIN|BELUM KAWIN|CERAI HIDUP|CERAI MATI)', word, re.IGNORECASE)
                        if status_match:
                            status_raw = status_match.group(0).upper()
                            # Bersihkan angka di akhir status
                            self.result.status_perkawinan = re.sub(r'\d+$', '', status_raw).strip()
                        else:
                            status_raw = word.replace("Perkawinan", "").replace("Status", "").strip()
                            # Bersihkan angka di akhir status
                            self.result.status_perkawinan = re.sub(r'\d+$', '', status_raw).strip()
                except IndexError:
                    self.result.status_perkawinan = ""

    def post_process(self):
        """Lakukan pemrosesan tambahan untuk membersihkan hasil"""
        # Bersihkan status perkawinan dari angka di akhir
        if hasattr(self.result, 'status_perkawinan') and self.result.status_perkawinan:
            self.result.status_perkawinan = re.sub(r'\s*\d+$', '', self.result.status_perkawinan)
        
        # Perbaiki golongan darah
        if hasattr(self.result, 'golongan_darah'):
            # Jika golongan darah tidak terdeteksi dengan baik atau tidak jelas
            if not self.result.golongan_darah or self.result.golongan_darah not in ["A", "B", "AB", "O", "-"]:
                self.result.golongan_darah = "-"  # Default ke '-'
        
        # Perbaiki agama BUDDHA (dua D)
        if hasattr(self.result, 'agama') and self.result.agama and 'BUDH' in self.result.agama.upper():
            self.result.agama = "BUDDHA"
        
        # Bersihkan pekerjaan dari karakter awal ":"
        if hasattr(self.result, 'pekerjaan') and self.result.pekerjaan:
            self.result.pekerjaan = re.sub(r'^[\s:]+', '', self.result.pekerjaan)

    def master_process(self):
        raw_text = self.process(self.image)
        self.extract(raw_text)
        
        # Post-processing untuk perbaikan hasil
        self.post_process()
        
        # Hapus field yang kosong dari hasil akhir
        self.clean_empty_fields()

    def clean_empty_fields(self):
        """Hapus field yang kosong dari hasil akhir"""
        for attr, value in list(self.result.__dict__.items()):
            if isinstance(value, str) and not value.strip():
                setattr(self.result, attr, None)

    def to_json(self):
        # Filter out None values
        filtered_dict = {k: v for k, v in self.result.__dict__.items() if v is not None}
        return json.dumps(filtered_dict, indent=4)

    def visualize_result(self, output_path="output/result.jpg"):
        """Visualisasi hasil ekstraksi pada gambar"""
        # Buat salinan gambar asli
        vis_img = self.original.copy()
        
        # Tambahkan teks hasil ekstraksi ke gambar
        font = cv2.FONT_HERSHEY_SIMPLEX
        y_pos = 30
        
        # Tampilkan beberapa field penting
        important_fields = {
            'NIK': getattr(self.result, 'nik', ''),
            'Nama': getattr(self.result, 'nama', ''),
            'TTL': f"{getattr(self.result, 'tempat_lahir', '')} {getattr(self.result, 'tanggal_lahir', '')}",
            'Jenis Kelamin': getattr(self.result, 'jenis_kelamin', ''),
            'Alamat': getattr(self.result, 'alamat', '')
        }
        
        for label, value in important_fields.items():
            if value:
                text = f"{label}: {value}"
                cv2.putText(vis_img, text, (10, y_pos), font, 0.7, (0, 255, 0), 2)
                y_pos += 30
        
        # Simpan gambar hasil
        cv2.imwrite(output_path, vis_img)
        
        return vis_img