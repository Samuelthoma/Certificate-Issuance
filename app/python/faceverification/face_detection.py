import sys
import cv2
import numpy as np
import json
import os
import datetime

def detect_face(image_path, output_path):
    try:
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Normalize the path
        image_path = os.path.normpath(image_path)
        
        # Load the image
        print(f"[DEBUG] Loading image from: {image_path}")
        image = cv2.imread(image_path)
        
        if image is None:
            raise ValueError(f"Could not load image from path: {image_path}")

        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Load face cascade classifier
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        if not os.path.exists(cascade_path):
            raise FileNotFoundError(f"Haar cascade file not found at {cascade_path}")
        
        face_cascade = cv2.CascadeClassifier(cascade_path)
        if face_cascade.empty():
            raise RuntimeError("Failed to load Haar cascade classifier")

        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        if len(faces) == 0:
            print("[INFO] No faces detected", file=sys.stderr)
            return False
        
        # Draw rectangles around the faces
        for (x, y, w, h) in faces:
            cv2.rectangle(image, (x, y), (x+w, y+h), (255, 0, 0), 2)

        # Save the output image
        cv2.imwrite(output_path, image)
        
        # Save face coordinates as JSON
        face_data = {
            "faces": [{"x": int(x), "y": int(y), "width": int(w), "height": int(h)} for (x, y, w, h) in faces],
            "image_width": image.shape[1],
            "image_height": image.shape[0],
            "detected_at": str(datetime.datetime.now())
        }
        
        json_path = output_path + ".json"
        with open(json_path, "w") as f:
            json.dump(face_data, f)
        
        print(f"[INFO] Face detection successful, results saved at {json_path}")
        return True

    except Exception as e:
        print(f"[ERROR] {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("[ERROR] Usage: python face_detection.py input_image output_image", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Print system info for debugging
        print(f"[DEBUG] Python version: {sys.version}")
        print(f"[DEBUG] OpenCV version: {cv2.__version__}")
        print(f"[DEBUG] Input path: {sys.argv[1]}")
        print(f"[DEBUG] Output path: {sys.argv[2]}")
        
        success = detect_face(sys.argv[1], sys.argv[2])
        
        if not success:
            print("[ERROR] Face detection failed", file=sys.stderr)
            sys.exit(1)
            
        print("[SUCCESS] Face detection completed successfully")
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        print(f"[FATAL ERROR] {str(e)}\n{traceback_str}", file=sys.stderr)
        sys.exit(1)
