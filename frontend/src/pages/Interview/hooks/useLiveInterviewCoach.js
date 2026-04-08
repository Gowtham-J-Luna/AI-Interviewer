import { useEffect, useMemo, useRef, useState } from "react";
import { buildLiveVoiceMetrics } from "../utils/liveInterviewMetrics.js";

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
  const pauseCountedRef = useRef(false);
  const combinedLengthRef = useRef(0);

  useEffect(() => {
    startedAtRef.current = null;
    setElapsedMs(0);
    setLongPauseCount(0);
    setLastSpeechAt(Date.now());
    pauseCountedRef.current = false;
    combinedLengthRef.current = 0;
  }, [resetKey]);

  useEffect(() => {
    if (micOn && !startedAtRef.current) {
      startedAtRef.current = Date.now();
      setLastSpeechAt(Date.now());
    }
  }, [micOn]);

  useEffect(() => {
    const combined = `${transcript} ${interimTranscript}`.trim();
    if (combined.length !== combinedLengthRef.current) {
      combinedLengthRef.current = combined.length;
      setLastSpeechAt(Date.now());
      pauseCountedRef.current = false;
    }
  }, [transcript, interimTranscript]);

  useEffect(() => {
    if (!startedAtRef.current) {
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
