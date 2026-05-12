import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Hand, Loader2, Mic, MicOff, PhoneCall, PhoneOff, Send, Video, VideoOff } from "lucide-react";

import { WS_BASE_URL } from "./config";
import { fetchAvailableSigns, translateLandmarks } from "./signApi";
import { useMediaPipeHands } from "./useMediaPipeHands";


const RTC_CONFIGURATION = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};


function createPeerId() {
  return `peer-${Math.random().toString(36).slice(2, 10)}`;
}


export default function App() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const recognitionTimerRef = useRef(null);
  const lastTranscriptRef = useRef("");

  const peerId = useMemo(createPeerId, []);
  const [roomId, setRoomId] = useState("demo-room");
  const [joinedRoom, setJoinedRoom] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("Not connected");
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [recognitionEnabled, setRecognitionEnabled] = useState(false);
  const [localTranscript, setLocalTranscript] = useState("Waiting for your sign...");
  const [remoteTranscript, setRemoteTranscript] = useState("The other person's text will appear here.");
  const [availableSigns, setAvailableSigns] = useState([]);
  const [error, setError] = useState("");
  const { detect, status: handModelStatus, error: handModelError } = useMediaPipeHands();

  useEffect(() => {
    fetchAvailableSigns()
      .then((data) => setAvailableSigns(data.signs || []))
      .catch(() => setAvailableSigns([]));
  }, []);

  const sendSocketMessage = useCallback((message) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ ...message, peerId }));
    }
  }, [peerId]);

  const ensurePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
    peerConnectionRef.current = peerConnection;

    localStreamRef.current?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSocketMessage({ type: "ice-candidate", candidate: event.candidate });
      }
    };

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    peerConnection.onconnectionstatechange = () => {
      setConnectionStatus(`WebRTC: ${peerConnection.connectionState}`);
    };

    return peerConnection;
  }, [sendSocketMessage]);

  const startCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  }, []);

  const handleSocketMessage = useCallback(async (event) => {
    const data = JSON.parse(event.data);
    const peerConnection = ensurePeerConnection();

    if (data.type === "peer-joined") {
      setConnectionStatus("Peer joined. Click Start call when both users are ready.");
      return;
    }

    if (data.type === "offer") {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      sendSocketMessage({ type: "answer", answer });
      setConnectionStatus("Answer sent");
      return;
    }

    if (data.type === "answer") {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      setConnectionStatus("Call connected");
      return;
    }

    if (data.type === "ice-candidate" && data.candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      return;
    }

    if (data.type === "transcript") {
      setRemoteTranscript(data.text);
    }
  }, [ensurePeerConnection, sendSocketMessage]);

  const joinRoom = useCallback(async () => {
    setError("");
    try {
      await startCamera();
      const safeRoomId = roomId.trim() || "demo-room";
      const socket = new WebSocket(`${WS_BASE_URL}/call/${safeRoomId}/?peer=${peerId}`);
      socketRef.current = socket;
      socket.onopen = () => {
        setJoinedRoom(safeRoomId);
        setConnectionStatus("Connected to signaling server");
        sendSocketMessage({ type: "peer-ready" });
      };
      socket.onmessage = handleSocketMessage;
      socket.onerror = () => setError("WebSocket connection failed. Is Django running?");
      socket.onclose = () => setConnectionStatus("Disconnected from signaling server");
    } catch (err) {
      setError(err.message || "Unable to start camera.");
    }
  }, [handleSocketMessage, peerId, roomId, sendSocketMessage, startCamera]);

  const startCall = useCallback(async () => {
    setError("");
    try {
      const peerConnection = ensurePeerConnection();
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      sendSocketMessage({ type: "offer", offer });
      setConnectionStatus("Offer sent");
    } catch (err) {
      setError(err.message || "Unable to start call.");
    }
  }, [ensurePeerConnection, sendSocketMessage]);

  const leaveRoom = useCallback(() => {
    recognitionTimerRef.current && clearInterval(recognitionTimerRef.current);
    recognitionTimerRef.current = null;
    setRecognitionEnabled(false);
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    socketRef.current?.close();
    socketRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setJoinedRoom("");
    setConnectionStatus("Not connected");
  }, []);

  const toggleTrack = (kind) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getTracks().filter((track) => track.kind === kind).forEach((track) => {
      track.enabled = !track.enabled;
      if (kind === "video") setCameraEnabled(track.enabled);
      if (kind === "audio") setMicEnabled(track.enabled);
    });
  };

  const translateCurrentHand = useCallback(async () => {
    if (!localVideoRef.current || handModelStatus !== "ready") {
      return;
    }

    const landmarks = detect(localVideoRef.current);
    if (!landmarks) {
      setLocalTranscript("Show one hand clearly inside the camera frame.");
      return;
    }

    try {
      const data = await translateLandmarks({ landmarks, roomId: joinedRoom, sender: peerId });
      const prediction = data.prediction;
      const text = `${prediction.text} (${Math.round(prediction.confidence * 100)}%)`;
      setLocalTranscript(text);

      if (prediction.text !== lastTranscriptRef.current && prediction.confidence >= 0.5) {
        lastTranscriptRef.current = prediction.text;
        sendSocketMessage({ type: "transcript", text: prediction.text });
      }
    } catch (err) {
      setLocalTranscript(err.message || "Translation failed.");
    }
  }, [detect, handModelStatus, joinedRoom, peerId, sendSocketMessage]);

  const toggleRecognition = () => {
    if (recognitionEnabled) {
      clearInterval(recognitionTimerRef.current);
      recognitionTimerRef.current = null;
      setRecognitionEnabled(false);
      return;
    }

    translateCurrentHand();
    recognitionTimerRef.current = setInterval(translateCurrentHand, 900);
    setRecognitionEnabled(true);
  };

  const sendManualTranscript = (text) => {
    setLocalTranscript(`${text} (manual demo)`);
    sendSocketMessage({ type: "transcript", text });
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Final year project starter</p>
          <h1>SignBridge: sign language video call translator</h1>
          <p className="hero-copy">
            Connect two users in a browser video call. MediaPipe reads hand landmarks, Django runs the sign
            classifier, and translated text is sent to the other participant in real time.
          </p>
        </div>
        <div className="status-card">
          <span>Room</span>
          <strong>{joinedRoom || "Not joined"}</strong>
          <small>{connectionStatus}</small>
        </div>
      </section>

      <section className="controls-card">
        <label>
          Room code
          <input value={roomId} onChange={(event) => setRoomId(event.target.value)} disabled={Boolean(joinedRoom)} />
        </label>
        {!joinedRoom ? (
          <button className="primary" onClick={joinRoom}>
            <Camera size={18} /> Join room
          </button>
        ) : (
          <>
            <button className="primary" onClick={startCall}>
              <PhoneCall size={18} /> Start call
            </button>
            <button onClick={() => toggleTrack("video")}>{cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />} Camera</button>
            <button onClick={() => toggleTrack("audio")}>{micEnabled ? <Mic size={18} /> : <MicOff size={18} />} Mic</button>
            <button onClick={leaveRoom}>
              <PhoneOff size={18} /> Leave
            </button>
          </>
        )}
      </section>

      {error && <div className="error-banner">{error}</div>}
      {handModelError && <div className="error-banner">Hand model: {handModelError}</div>}

      <section className="video-grid">
        <article className="video-card">
          <div className="video-header">
            <span>You</span>
            <small>{peerId}</small>
          </div>
          <video ref={localVideoRef} autoPlay muted playsInline />
        </article>
        <article className="video-card">
          <div className="video-header">
            <span>Friend</span>
            <small>Remote stream</small>
          </div>
          <video ref={remoteVideoRef} autoPlay playsInline />
        </article>
      </section>

      <section className="translation-grid">
        <article className="translation-card">
          <div className="translation-title">
            <Hand size={20} />
            <h2>Your sign</h2>
          </div>
          <p>{localTranscript}</p>
          <button className="primary" onClick={toggleRecognition} disabled={!joinedRoom || handModelStatus !== "ready"}>
            {handModelStatus === "loading" && <Loader2 className="spin" size={18} />}
            {recognitionEnabled ? "Stop recognition" : "Start sign recognition"}
          </button>
          <small>Model status: {handModelStatus}</small>
        </article>

        <article className="translation-card accent">
          <div className="translation-title">
            <Send size={20} />
            <h2>Friend sees</h2>
          </div>
          <p>{remoteTranscript}</p>
          <small>Recognized text is relayed over the room WebSocket.</small>
        </article>
      </section>

      <section className="manual-panel">
        <h2>Demo signs</h2>
        <p>Use these buttons while testing the call flow or before you train your real model.</p>
        <div className="sign-buttons">
          {availableSigns.map((sign) => (
            <button key={sign} onClick={() => sendManualTranscript(sign)} disabled={!joinedRoom}>
              {sign}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
