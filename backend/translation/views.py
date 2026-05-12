import json
from datetime import datetime, timezone

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .ml_model import DEMO_SIGNS, classifier


@require_GET
def health(_request):
    return JsonResponse({"status": "ok", "service": "sign-language-backend"})


@require_GET
def signs(_request):
    return JsonResponse(
        {
            "signs": DEMO_SIGNS,
            "note": "The demo classifier can be replaced with a trained joblib model using SIGN_MODEL_PATH.",
        }
    )


@csrf_exempt
@require_POST
def translate_landmarks(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
        landmarks = payload.get("landmarks", [])
        prediction = classifier.predict_landmarks(landmarks)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    return JsonResponse(
        {
            "prediction": prediction.to_dict(),
            "roomId": payload.get("roomId"),
            "sender": payload.get("sender"),
            "receivedAt": datetime.now(timezone.utc).isoformat(),
        }
    )


@csrf_exempt
@require_POST
def translate_frame(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    prediction = classifier.predict_frame(payload.get("image", ""))
    return JsonResponse(
        {
            "prediction": prediction.to_dict(),
            "roomId": payload.get("roomId"),
            "sender": payload.get("sender"),
            "receivedAt": datetime.now(timezone.utc).isoformat(),
        }
    )
