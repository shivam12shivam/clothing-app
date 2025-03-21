import os
import cv2
import dlib
import sys

# Load input image
input_path, output_path = sys.argv[1], sys.argv[2]
image = cv2.imread(input_path)

# Load face detector & landmark predictor
detector = dlib.get_frontal_face_detector()
predictor_path = os.path.join(os.path.dirname(__file__), "shape_predictor_68_face_landmarks.dat")
predictor = dlib.shape_predictor(predictor_path)


# Detect faces
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
faces = detector(gray)

for face in faces:
    landmarks = predictor(gray, face)
    for i in range(68):  # Draw facial landmarks
        x, y = landmarks.part(i).x, landmarks.part(i).y
        cv2.circle(image, (x, y), 2, (0, 255, 0), -1)

cv2.imwrite(output_path, image)
