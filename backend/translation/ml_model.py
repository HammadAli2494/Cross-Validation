import base64
import io
import math
import os
from dataclasses import asdict, dataclass
from typing import Iterable, List, Sequence

import joblib
import numpy as np
from django.conf import settings
from PIL import Image


LANDMARK_COUNT = 21
VALUES_PER_LANDMARK = 3
DEMO_SIGNS = ["hello", "yes", "no", "thank you", "please", "i love you"]


@dataclass(frozen=True)
class SignPrediction:
    text: str
    confidence: float
    source: str
    detail: str = ""

    def to_dict(self):
        payload = asdict(self)
        payload["confidence"] = round(self.confidence, 3)
        return payload


class SignLanguageClassifier:
    """Classifier wrapper that uses a saved model when present and a demo fallback otherwise."""

    def __init__(self, model_path: str | None = None):
        self.model_path = model_path or settings.SIGN_MODEL_PATH
        self.model = None
        self.classes_: Sequence[str] | None = None
        self._load_model()

    def _load_model(self):
        if not self.model_path or not os.path.exists(self.model_path):
            return

        loaded = joblib.load(self.model_path)
        if isinstance(loaded, dict):
            self.model = loaded.get("model")
            self.classes_ = loaded.get("classes")
        else:
            self.model = loaded
            self.classes_ = getattr(loaded, "classes_", None)

    def predict_landmarks(self, landmarks: Iterable) -> SignPrediction:
        features = normalize_landmarks(landmarks)
        if self.model is not None:
            return self._predict_with_model(features)
        return self._predict_with_rules(features)

    def predict_frame(self, image_data: str) -> SignPrediction:
        image = decode_image(image_data)
        if image is None:
            return SignPrediction(
                text="No readable image",
                confidence=0.0,
                source="frame-validator",
                detail="Send a base64 data URL or raw base64 image.",
            )

        width, height = image.size
        if width < 120 or height < 120:
            return SignPrediction(
                text="Move closer to the camera",
                confidence=0.25,
                source="demo-frame-check",
                detail="Frame is too small for reliable hand detection.",
            )

        return SignPrediction(
            text="Hand landmarks required",
            confidence=0.35,
            source="demo-frame-check",
            detail="The frontend extracts hand landmarks with MediaPipe and sends them to /api/translate/landmarks.",
        )

    def _predict_with_model(self, features: np.ndarray) -> SignPrediction:
        row = features.reshape(1, -1)
        label = str(self.model.predict(row)[0])
        confidence = 0.8

        if hasattr(self.model, "predict_proba"):
            probabilities = self.model.predict_proba(row)[0]
            best_index = int(np.argmax(probabilities))
            confidence = float(probabilities[best_index])
            if self.classes_ is not None and len(self.classes_) > best_index:
                label = str(self.classes_[best_index])

        return SignPrediction(text=label, confidence=confidence, source="trained-model")

    def _predict_with_rules(self, features: np.ndarray) -> SignPrediction:
        points = features.reshape(LANDMARK_COUNT, VALUES_PER_LANDMARK)
        fingers = extended_fingers(points)

        thumb, index, middle, ring, pinky = (
            fingers["thumb"],
            fingers["index"],
            fingers["middle"],
            fingers["ring"],
            fingers["pinky"],
        )

        if all(fingers.values()):
            return SignPrediction("hello", 0.72, "demo-rule-based", "Open palm detected.")
        if thumb and index and pinky and not middle and not ring:
            return SignPrediction("i love you", 0.78, "demo-rule-based", "Thumb, index, and pinky are extended.")
        if index and middle and not ring and not pinky:
            return SignPrediction("no", 0.66, "demo-rule-based", "Two-finger gesture detected.")
        if thumb and not any([index, middle, ring, pinky]):
            return SignPrediction("yes", 0.64, "demo-rule-based", "Thumb gesture detected.")
        if not any(fingers.values()):
            return SignPrediction("please", 0.58, "demo-rule-based", "Closed hand detected.")

        return SignPrediction("thank you", 0.55, "demo-rule-based", "Fallback demo gesture.")


def normalize_landmarks(landmarks: Iterable) -> np.ndarray:
    values: List[float] = []
    for point in landmarks:
        if isinstance(point, dict):
            values.extend([float(point.get("x", 0)), float(point.get("y", 0)), float(point.get("z", 0))])
        else:
            point_values = list(point)
            values.extend([float(point_values[0]), float(point_values[1]), float(point_values[2] if len(point_values) > 2 else 0)])

    expected = LANDMARK_COUNT * VALUES_PER_LANDMARK
    if len(values) != expected:
        raise ValueError(f"Expected {LANDMARK_COUNT} landmarks with x, y, z values; received {len(values) // VALUES_PER_LANDMARK}.")

    array = np.array(values, dtype=np.float32).reshape(LANDMARK_COUNT, VALUES_PER_LANDMARK)
    wrist = array[0].copy()
    array = array - wrist

    middle_mcp = array[9]
    scale = math.sqrt(float(np.dot(middle_mcp, middle_mcp))) or 1.0
    array = array / scale
    return array.reshape(-1)


def extended_fingers(points: np.ndarray) -> dict[str, bool]:
    return {
        "thumb": abs(points[4][0] - points[2][0]) > 0.32,
        "index": points[8][1] < points[6][1],
        "middle": points[12][1] < points[10][1],
        "ring": points[16][1] < points[14][1],
        "pinky": points[20][1] < points[18][1],
    }


def decode_image(image_data: str) -> Image.Image | None:
    if not image_data:
        return None

    try:
        _, encoded = image_data.split(",", 1) if "," in image_data else ("", image_data)
        raw = base64.b64decode(encoded)
        image = Image.open(io.BytesIO(raw))
        return image.convert("RGB")
    except Exception:
        return None


classifier = SignLanguageClassifier()
