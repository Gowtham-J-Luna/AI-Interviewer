import { useEffect, useMemo, useRef, useState } from "react";
import { buildLiveVoiceMetrics } from "../Utils/liveInterviewMetrics.js";

export const useLiveInterviewCoach = ({
  transcript,
  interimTranscript,
  micOn,
  isListening,
  speechAccuracy = 0,
  resetKey,
}) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [longPauseCount, setLongPauseCount] = useState(0);
  const [lastSpeechAt, setLastSpeechAt] = useState(Date.now());
  const startedAtRef = useRef(null);
  const hasSpeechStartedRef = useRef(false);
  const pauseCountedRef = useRef(false);
  const combinedLengthRef = useRef(0);

  useEffect(() => {
    startedAtRef.current = null;
    hasSpeechStartedRef.current = false;
    setElapsedMs(0);
    setLongPauseCount(0);
    setLastSpeechAt(Date.now());
    pauseCountedRef.current = false;
    combinedLengthRef.current = 0;
  }, [resetKey]);

  useEffect(() => {
    const combined = `${transcript} ${interimTranscript}`.trim();
    if (combined.length !== combinedLengthRef.current) {
      if (combined.length > 0 && !hasSpeechStartedRef.current) {
        hasSpeechStartedRef.current = true;
        startedAtRef.current = Date.now();
      }
      combinedLengthRef.current = combined.length;
      setLastSpeechAt(Date.now());
      pauseCountedRef.current = false;
    }
  }, [transcript, interimTranscript]);

  useEffect(() => {
    if (!micOn || !startedAtRef.current || !hasSpeechStartedRef.current) {
      return undefined;
    }

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);

      if (isListening && Date.now() - lastSpeechAt > 2600 && !pauseCountedRef.current) {
        setLongPauseCount((count) => count + 1);
        pauseCountedRef.current = true;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [micOn, isListening, lastSpeechAt]);

  const metrics = useMemo(
    () =>
      buildLiveVoiceMetrics({
        transcript: `${transcript} ${interimTranscript}`.trim(),
        elapsedMs,
        longPauseCount,
        speechAccuracy,
      }),
    [transcript, interimTranscript, elapsedMs, longPauseCount, speechAccuracy]
  );

  return {
    metrics,
    elapsedMs,
    longPauseCount,
  };
};
