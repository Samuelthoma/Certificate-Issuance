import sys
import cv2
import numpy as np
import json
import os
import datetime
import mediapipe as mp

def calculate_ear(landmarks, eye_indices):
    """
    Calculate the Eye Aspect Ratio (EAR) for blink detection.
    """
    points = [landmarks[idx] for idx in eye_indices]

    # Calculate the horizontal distance
    horizontal_dist = np.linalg.norm(points[0] - points[3])

    # Calculate the vertical distances
    v1 = np.linalg.norm(points[1] - points[5])
    v2 = np.linalg.norm(points[2] - points[4])

    # Calculate the EAR
    ear = (v1 + v2) / (2.0 * horizontal_dist)
    return ear

def detect_blink(image_path, output_path):
    # Load the image
    image = cv2.imread(image_path)
    if image is None:
        print("Error: Could not load image")
        return False

    session_id = os.path.basename(image_path).split('_')[0]

    try:
        # Initialize MediaPipe Face Mesh
        mp_face_mesh = mp.solutions.face_mesh

        # Define eye landmark indices
        LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]  # Left eye landmarks
        RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]  # Right eye landmarks
        EAR_THRESHOLD = 0.25  # Adjust as needed

        with mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            min_detection_confidence=0.5) as face_mesh:
            
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(image_rgb)

            if not results.multi_face_landmarks:
                print("No faces detected in blink check")
                return False

            # Get first face landmarks
            face_landmarks = results.multi_face_landmarks[0]
            h, w, _ = image.shape
            landmarks = np.array([(lm.x * w, lm.y * h) for lm in face_landmarks.landmark])

            # Calculate EAR for both eyes
            left_ear = calculate_ear(landmarks, LEFT_EYE_INDICES)
            right_ear = calculate_ear(landmarks, RIGHT_EYE_INDICES)
            avg_ear = (left_ear + right_ear) / 2.0

            # Detect blink based on EAR threshold
            blink_detected = avg_ear < EAR_THRESHOLD

            # Confidence calculation
            confidence = 1.0 - (avg_ear / 0.3) if blink_detected else avg_ear / 0.3
            confidence = max(0.0, min(1.0, confidence))  # Clamp between 0 and 1

            # Draw eye landmarks for debugging
            for idx in LEFT_EYE_INDICES + RIGHT_EYE_INDICES:
                x, y = int(landmarks[idx][0]), int(landmarks[idx][1])
                cv2.circle(image, (x, y), 2, (0, 255, 0), -1)

            # Save the debug image
            cv2.imwrite(output_path, image)

            # Save JSON result
            output_dir = os.path.dirname(os.path.dirname(image_path))
            result_path = os.path.join(output_dir, f"blink_result_{session_id}.json")

            result = {
                "blink_detected": bool(blink_detected), 
                "confidence": float(confidence),
                "ear_value": float(avg_ear),
                "detected_at": str(datetime.datetime.now())
            }


            with open(result_path, "w") as f:
                json.dump(result, f)

            return blink_detected

    except Exception as e:
        print(f"Error in blink detection: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python liveness_blink.py input_image output_path")
        sys.exit(1)

    input_image = sys.argv[1]
    output_path = sys.argv[2]

    try:
        success = detect_blink(input_image, output_path)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
