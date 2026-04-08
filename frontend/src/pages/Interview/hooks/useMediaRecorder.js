import { useRef, useState } from "react";

const getSupportedMimeType = () => {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
};

export const useMediaRecorder = (videoRef) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordingMeta, setRecordingMeta] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(null);
  const stopResolverRef = useRef(null);

  const startRecording = async () => {
    const stream = videoRef.current?.srcObject;
    if (!stream || isRecording) {
      return false;
    }

    try {
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      setRecordedChunks([]);
      setRecordingMeta(null);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        const meta = {
          mimeType: type,
          sizeBytes: blob.size,
          durationMs: startedAtRef.current ? Date.now() - startedAtRef.current : 0,
          startedAt: startedAtRef.current ? new Date(startedAtRef.current).toISOString() : null,
          endedAt: new Date().toISOString(),
        };

        setRecordedChunks(blob.size ? [blob] : []);
        setRecordingMeta(meta);
        setIsRecording(false);
        mediaRecorderRef.current = null;

        if (stopResolverRef.current) {
          stopResolverRef.current({ blob: blob.size ? blob : null, meta });
          stopResolverRef.current = null;
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      return true;
    } catch (error) {
      return false;
    }
  };

  const stopRecording = () =>
    new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;

      if (!recorder || recorder.state === "inactive") {
        resolve({ blob: recordedChunks[0] || null, meta: recordingMeta });
        return;
      }

      stopResolverRef.current = resolve;
      recorder.stop();
    });

  const resetRecording = () => {
    chunksRef.current = [];
    startedAtRef.current = null;
    setRecordedChunks([]);
    setRecordingMeta(null);
  };

  return {
    isRecording,
    recordedChunks,
    recordingMeta,
    startRecording,
    stopRecording,
    resetRecording,
  };
};
