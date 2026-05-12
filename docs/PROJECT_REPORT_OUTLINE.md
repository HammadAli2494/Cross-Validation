# Final year project report outline

## Title

SignBridge: Real-Time Sign Language Translation During Video Calls

## Problem statement

People who rely on sign language can face communication barriers during online video calls when the other participant does not understand sign language. This project provides a browser-based video-call interface that recognizes hand signs and displays translated text to the other participant.

## Objectives

- Build a user-friendly video-call interface.
- Capture hand signs from live video.
- Extract hand landmarks using a computer-vision model.
- Classify signs into text using an ML classifier.
- Send translated text to the other call participant in real time.

## Methodology

1. Use React for the video-call frontend.
2. Use WebRTC for peer-to-peer audio/video.
3. Use Django Channels for signaling and translated text messages.
4. Use MediaPipe to extract hand landmarks.
5. Train a supervised classifier on labeled sign-language landmark data.
6. Evaluate the model with accuracy, precision, recall, and confusion matrix.

## Core modules

- Frontend video-call room
- Sign recognition panel
- Django REST translation API
- WebSocket signaling server
- ML training and inference module

## Expected outcomes

- Two users can join the same room and start a video call.
- The signing user's hand gesture is converted into text.
- The other participant sees the translated text in the call interface.
- The ML layer can be improved by replacing the demo classifier with a trained model.

## Limitations

- Static signs are easier than dynamic signs.
- Accuracy depends on dataset size, camera quality, lighting, and hand visibility.
- Production WebRTC needs TURN servers for strict networks.

## Future work

- Add more signs and regional sign-language datasets.
- Support sentence construction from sign sequences.
- Add speech output for translated text.
- Add user authentication and saved transcripts.
- Deploy on cloud infrastructure with Redis and HTTPS.
