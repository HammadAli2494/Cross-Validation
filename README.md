# SignBridge: Sign Language Video Call Translator

SignBridge is a final-year-project starter that combines:

- **React + Vite frontend** for a friendly two-person video-call interface.
- **Django backend** for REST APIs, WebSocket signaling, and ML inference.
- **Machine learning layer** for converting hand landmarks into text.

The current code is runnable as a demo. It includes a rule-based fallback classifier so the full call and translation flow works immediately, plus a training script and model-loading path for replacing the fallback with a real trained sign-language model.

## How it works

1. A user joins a room in the React app.
2. The browser captures camera/microphone with WebRTC.
3. Django Channels provides room-based WebSocket signaling for WebRTC offers, answers, ICE candidates, and translated text.
4. MediaPipe Hands runs in the browser to extract 21 hand landmarks from the user's video.
5. The frontend sends landmarks to Django at `/api/translate/landmarks/`.
6. Django returns recognized text and relays it to the other user over WebSocket.

## Project structure

```text
backend/
  manage.py
  requirements.txt
  sign_language_project/   Django settings, ASGI, URLs
  translation/             REST views, WebSocket consumer, ML classifier
frontend/
  src/                     React app, WebRTC, MediaPipe integration
  package.json
ml/
  train_sign_classifier.py Training utility for landmark CSV data
docs/
  ML_MODEL.md              How to collect data and train the model
```

## Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

REST endpoints:

- `GET /api/health/`
- `GET /api/signs/`
- `POST /api/translate/landmarks/`
- `POST /api/translate/frame/`

WebSocket endpoint:

- `ws://localhost:8000/ws/call/<room-code>/?peer=<peer-id>`

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

For two-person testing, open the same room in two browser windows or on two devices on the same network. One user clicks **Join room**, the other joins the same room, then click **Start call**.

## Environment variables

Backend:

```bash
DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=true
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
SIGN_MODEL_PATH=backend/models/sign_model.joblib
```

Frontend:

```bash
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws
```

## ML model path

The backend tries to load a trained model from `SIGN_MODEL_PATH`. If no model file exists, it uses the demo classifier in `backend/translation/ml_model.py`.

To train a real model, collect landmark rows with labels, then run:

```bash
python ml/train_sign_classifier.py --csv data/sign_landmarks.csv --output backend/models/sign_model.joblib
```

See [docs/ML_MODEL.md](docs/ML_MODEL.md) for dataset format and training notes.

## Suggested final-year-project extensions

- Add user accounts and call history.
- Store translated transcripts per call.
- Train on your target sign-language alphabet or phrase dataset.
- Add text-to-speech for translated signs.
- Deploy Django with Redis-backed Channels instead of the in-memory layer.
- Add TURN server support for reliable WebRTC connections across networks.
