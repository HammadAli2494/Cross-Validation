import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";


const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";


export function useMediaPipeHands() {
  const landmarkerRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadModel() {
      setStatus("loading");
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: HAND_MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });

        if (!cancelled) {
          landmarkerRef.current = landmarker;
          setStatus("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load MediaPipe hand model.");
          setStatus("error");
        }
      }
    }

    loadModel();

    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
    };
  }, []);

  const detect = useCallback((videoElement) => {
    const landmarker = landmarkerRef.current;
    if (!landmarker || !videoElement || videoElement.readyState < 2) {
      return null;
    }

    const result = landmarker.detectForVideo(videoElement, performance.now());
    return result.landmarks?.[0] || null;
  }, []);

  return { detect, status, error };
}
