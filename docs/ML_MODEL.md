# ML model guide

The application already has a complete inference path:

React camera video -> MediaPipe hand landmarks -> Django REST API -> classifier -> translated text.

The demo classifier is intentionally simple. For a final-year project, you should train a real model using your own labeled landmark data.

## Landmark format

MediaPipe returns 21 hand landmarks. Each landmark has `x`, `y`, and `z`, so each sample has 63 features:

```csv
label,x0,y0,z0,x1,y1,z1,...,x20,y20,z20
hello,0.52,0.82,-0.01,0.50,0.74,-0.02,...
```

Recommended labels:

- Alphabet signs: `a`, `b`, `c`, ...
- Common phrases: `hello`, `thank you`, `yes`, `no`, `please`, `i love you`

## Collecting data

1. Record multiple users, lighting conditions, hand sizes, and camera positions.
2. Capture at least dozens of samples per sign for a prototype; more is better.
3. Keep the same MediaPipe landmark order used by the frontend.
4. Split data by person when evaluating if possible, so the test set proves the model works for unseen users.

## Training

Install backend dependencies first:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

Train and save the model:

```bash
python ml/train_sign_classifier.py \
  --csv data/sign_landmarks.csv \
  --output backend/models/sign_model.joblib
```

Restart Django after saving the model. The backend will load `backend/models/sign_model.joblib` by default.

The training script normalizes each sample relative to the wrist and hand size. The backend applies the same normalization during inference.

## Improving accuracy

- Avoid mixing raw image models and landmark models in the same dataset.
- Add a confidence threshold in the UI before sending text to the other user.
- Add a "no sign" class to reduce false positives.
- Consider sequence models such as LSTM/GRU/Transformer if you want dynamic signs that require motion over time.

## Deployment note

The default Django Channels layer is in-memory for local development. Use Redis as the channel layer in production so multiple backend workers can share WebSocket room messages.
