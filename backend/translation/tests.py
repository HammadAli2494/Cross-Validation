from django.test import Client, SimpleTestCase

from .ml_model import SignLanguageClassifier


def open_palm_landmarks():
    points = [[0.0, 0.0, 0.0] for _ in range(21)]
    points[2] = [0.15, -0.2, 0.0]
    points[4] = [0.65, -0.3, 0.0]
    points[6] = [0.1, -0.4, 0.0]
    points[8] = [0.1, -0.8, 0.0]
    points[9] = [0.0, -0.35, 0.0]
    points[10] = [0.0, -0.45, 0.0]
    points[12] = [0.0, -0.9, 0.0]
    points[14] = [-0.1, -0.4, 0.0]
    points[16] = [-0.1, -0.8, 0.0]
    points[18] = [-0.2, -0.35, 0.0]
    points[20] = [-0.2, -0.7, 0.0]
    return points


class ClassifierTests(SimpleTestCase):
    def test_open_palm_predicts_hello(self):
        classifier = SignLanguageClassifier(model_path="/tmp/does-not-exist.joblib")
        prediction = classifier.predict_landmarks(open_palm_landmarks())

        self.assertEqual(prediction.text, "hello")
        self.assertGreater(prediction.confidence, 0.5)


class ApiTests(SimpleTestCase):
    def test_health_endpoint(self):
        response = Client().get("/api/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
