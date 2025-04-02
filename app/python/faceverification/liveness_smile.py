import sys
import cv2
import numpy as np
import json
import os
import datetime
import mediapipe as mp

def detect_smile(image_path, output_path):
    # Load the image
    image = cv2.imread(image_path)
    if image is None:
        print("Error: Could not load image")
        return False

    session_id = os.path.basename(image_path).split('_')[0]

    try:
        # Initialize MediaPipe Face Mesh
        mp_face_mesh = mp.solutions.face_mesh
        
        # Define mouth landmark indices
        # Upper lip: 13, 14, 312
        # Lower lip: 17, 16, 15
        UPPER_LIP_INDICES = [13, 14, 312]
        LOWER_LIP_INDICES = [17, 16, 15]
        SMILE_THRESHOLD = 0.3  # Adjust as needed

        with mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            min_detection_confidence=0.5) as face_mesh:
            
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(image_rgb)

            if not results.multi_face_landmarks:
                print("No faces detected in smile check")
                return False

            # Get first face landmarks
            face_landmarks = results.multi_face_landmarks[0]
            h, w, _ = image.shape
            landmarks = np.array([(lm.x * w, lm.y * h) for lm in face_landmarks.landmark])

            # Calculate mouth width to height ratio for smile detection
            upper_lip_points = [landmarks[idx] for idx in UPPER_LIP_INDICES]
            lower_lip_points = [landmarks[idx] for idx in LOWER_LIP_INDICES]
            
            # Calculate mouth width (distance between corners)
            mouth_width = np.linalg.norm(landmarks[61] - landmarks[291])
            
            # Calculate mouth height (distance between upper and lower lip)
            mouth_height = np.linalg.norm(np.mean(upper_lip_points, axis=0) - np.mean(lower_lip_points, axis=0))
            
            # Calculate ratio
            mouth_ratio = mouth_width / (mouth_height + 1e-5)  # Add small constant to avoid division by zero
            
            # Detect smile based on ratio threshold
            smile_detected = mouth_ratio > SMILE_THRESHOLD
            
            # Confidence calculation
            confidence = (mouth_ratio / SMILE_THRESHOLD) - 0.5 if smile_detected else 0.5 - (mouth_ratio / SMILE_THRESHOLD)
            confidence = max(0.0, min(1.0, confidence))  # Clamp between 0 and 1
            
            # Draw mouth landmarks for debugging
            mouth_indices = UPPER_LIP_INDICES + LOWER_LIP_INDICES + [61, 291]
            for idx in mouth_indices:
                x, y = int(landmarks[idx][0]), int(landmarks[idx][1])
                cv2.circle(image, (x, y), 2, (0, 255, 0), -1)
            
            # Save the debug image
            cv2.imwrite(output_path, image)
            
            # Save JSON result
            output_dir = os.path.dirname(os.path.dirname(image_path))
            result_path = os.path.join(output_dir, f"smile_result_{session_id}.json")
            
            result = {
                "smile_detected": bool(smile_detected),
                "confidence": float(confidence),
                "mouth_ratio": float(mouth_ratio),
                "detected_at": str(datetime.datetime.now())
            }
            
            with open(result_path, "w") as f:
                json.dump(result, f)
            
            return smile_detected
            
    except Exception as e:
        print(f"Error in smile detection: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python liveness_smile.py input_image output_path")
        sys.exit(1)
    
    input_image = sys.argv[1]
    output_path = sys.argv[2]
    
    try:
        success = detect_smile(input_image, output_path)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)