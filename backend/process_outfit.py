import cv2
import numpy as np
import mediapipe as mp
import sys

def align_clothing(person_path, clothing_path, output_path):
    # Load images
    person_img = cv2.imread(person_path)
    clothing_img = cv2.imread(clothing_path, cv2.IMREAD_UNCHANGED)
    
    # Initialize MediaPipe
    mp_pose = mp.solutions.pose
    mp_selfie_seg = mp.solutions.selfie_segmentation

    with mp_pose.Pose(
        static_image_mode=True,
        model_complexity=2,
        min_detection_confidence=0.7
    ) as pose, mp_selfie_seg.SelfieSegmentation(model_selection=1) as segment:

        # Process human image
        person_rgb = cv2.cvtColor(person_img, cv2.COLOR_BGR2RGB)
        pose_results = pose.process(person_rgb)
        seg_results = segment.process(person_rgb)

        if not pose_results.pose_landmarks:
            raise ValueError("No pose detected in the human image")

        # Get body landmarks
        h, w = person_img.shape[:2]
        landmarks = pose_results.pose_landmarks.landmark
        
        # Key body points for clothing alignment
        body_points = {
            'left_shoulder': (int(landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].x * w),
                              int(landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].y * h)),
            'right_shoulder': (int(landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].x * w),
                               int(landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].y * h)),
            'left_hip': (int(landmarks[mp_pose.PoseLandmark.LEFT_HIP].x * w),
                         int(landmarks[mp_pose.PoseLandmark.LEFT_HIP].y * h)),
            'right_hip': (int(landmarks[mp_pose.PoseLandmark.RIGHT_HIP].x * w),
                          int(landmarks[mp_pose.PoseLandmark.RIGHT_HIP].y * h))
        }

        # Calculate clothing dimensions with perspective
        src_points = np.float32([
            [0, 0],  # Top-left of clothing
            [clothing_img.shape[1], 0],  # Top-right
            [clothing_img.shape[1], clothing_img.shape[0]],  # Bottom-right
            [0, clothing_img.shape[0]]  # Bottom-left
        ])

        dst_points = np.float32([
            body_points['left_shoulder'],
            body_points['right_shoulder'],
            body_points['right_hip'],
            body_points['left_hip']
        ])

        # Calculate perspective transform
        M = cv2.getPerspectiveTransform(src_points, dst_points)
        
        # Warp clothing image
        warped_cloth = cv2.warpPerspective(
            clothing_img,
            M,
            (w, h),
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0, 0, 0, 0)
        )

        # Enhanced blending
        alpha = warped_cloth[:, :, 3] / 255.0 if warped_cloth.shape[2] == 4 else np.ones(warped_cloth.shape[:2])
        alpha = cv2.GaussianBlur(alpha, (15, 15), 0)
        alpha = np.stack([alpha]*3, axis=-1)

        # Create shadow effect
        shadow = cv2.GaussianBlur(alpha, (25, 25), 0) * 0.4
        person_img = person_img.astype(float)
        warped_rgb = warped_cloth[:, :, :3].astype(float)

        # Combine images
        person_img = person_img * (1 - shadow) + warped_rgb * alpha
        person_img = np.clip(person_img, 0, 255).astype(np.uint8)

        # Apply body segmentation mask
        mask = (seg_results.segmentation_mask > 0.5).astype(np.uint8) * 255
        person_img = cv2.bitwise_and(person_img, person_img, mask=mask)

        cv2.imwrite(output_path, person_img)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python process_outfit.py <human_image> <clothing_image> <output_path>")
        sys.exit(1)
    
    try:
        align_clothing(sys.argv[1], sys.argv[2], sys.argv[3])
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)