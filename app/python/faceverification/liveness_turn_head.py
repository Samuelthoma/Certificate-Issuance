import sys
import cv2
import numpy as np
import json
import os
import datetime
import mediapipe as mp

def detect_head_turn(image_path, output_path):
    # Load the image
    image = cv2.imread(image_path)
    if image is None:
        print("Error: Could not load image")
        return False

    session_id = os.path.basename(image_path).split('_')[0]

    try:
        # Initialize MediaPipe Face Mesh
        mp_face_mesh = mp.solutions.face_mesh
        
        # Define facial landmarks for pose estimation
        # Center of face: nose tip (1)
        # Left side: left eye outer corner (33)
        # Right side: right eye outer corner (263)
        # Top: forehead center (10)
        # Bottom: chin (152)
        NOSE_TIP = 1
        LEFT_EYE_OUTER = 33
        RIGHT_EYE_OUTER = 263
        FOREHEAD = 10
        CHIN = 152
        
        # Define threshold for head turn detection
        YAW_THRESHOLD = 0.15  # Threshold for left/right turn
        
        with mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            min_detection_confidence=0.5) as face_mesh:
            
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(image_rgb)

            if not results.multi_face_landmarks:
                print("No faces detected in head turn check")
                return False

            # Get first face landmarks
            face_landmarks = results.multi_face_landmarks[0]
            h, w, _ = image.shape
            landmarks = np.array([(lm.x * w, lm.y * h) for lm in face_landmarks.landmark])
            
            # Get 3D face model points
            nose = landmarks[NOSE_TIP]
            left_eye = landmarks[LEFT_EYE_OUTER]
            right_eye = landmarks[RIGHT_EYE_OUTER]
            forehead = landmarks[FOREHEAD]
            chin = landmarks[CHIN]
            
            # Calculate face width (distance between eyes)
            face_width = np.linalg.norm(right_eye - left_eye)
            
            # Calculate nose position relative to eyes
            # In frontal view, nose should be at the center
            eye_center = (left_eye + right_eye) / 2
            nose_offset_x = (nose[0] - eye_center[0]) / face_width
            
            # Calculate yaw angle (rough approximation)
            # Positive values indicate right turn, negative values indicate left turn
            yaw_angle = nose_offset_x * 45  # Scale to approximate degrees
            
            # Calculate distance ratios for left and right sides of face
            # In a turned face, one side will appear closer than the other
            left_dist = np.linalg.norm(nose - left_eye)
            right_dist = np.linalg.norm(nose - right_eye)
            lr_ratio = left_dist / (right_dist + 1e-5)
            
            # Detect head turn based on nose offset and distance ratio
            turn_detected = abs(nose_offset_x) > YAW_THRESHOLD
            turn_direction = "right" if nose_offset_x > 0 else "left"
            
            # Confidence calculation
            confidence = min(abs(nose_offset_x) / YAW_THRESHOLD, 1.0) if turn_detected else 0.5
            
            # Draw facial landmarks for debugging
            face_indices = [NOSE_TIP, LEFT_EYE_OUTER, RIGHT_EYE_OUTER, FOREHEAD, CHIN]
            for idx in face_indices:
                x, y = int(landmarks[idx][0]), int(landmarks[idx][1])
                cv2.circle(image, (x, y), 3, (0, 255, 0), -1)
            
            # Draw line from eye center to nose for visualization
            eye_center_point = (int(eye_center[0]), int(eye_center[1]))
            nose_point = (int(nose[0]), int(nose[1]))
            cv2.line(image, eye_center_point, nose_point, (0, 0, 255), 2)
            
            # Save the debug image
            cv2.imwrite(output_path, image)
            
            # Save JSON result
            output_dir = os.path.dirname(os.path.dirname(image_path))
            result_path = os.path.join(output_dir, f"head_turn_result_{session_id}.json")
            
            result = {
                "head_turn_detected": bool(turn_detected),
                "turn_direction": turn_direction,
                "yaw_angle": float(yaw_angle),
                "lr_ratio": float(lr_ratio),
                "confidence": float(confidence),
                "detected_at": str(datetime.datetime.now())
            }
            
            with open(result_path, "w") as f:
                json.dump(result, f)
            
            return turn_detected
            
    except Exception as e:
        print(f"Error in head turn detection: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python liveness_turn_head.py input_image output_path")
        sys.exit(1)
    
    input_image = sys.argv[1]
    output_path = sys.argv[2]
    
    try:
        success = detect_head_turn(input_image, output_path)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)