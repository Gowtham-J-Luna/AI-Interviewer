import { useEffect, useMemo, useRef, useState } from "react";

const MEDIAPIPE_WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";
const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const LEFT_EYE_OUTER = 33;
const LEFT_EYE_INNER = 133;
const LEFT_EYE_TOP = 159;
const LEFT_EYE_BOTTOM = 145;
const RIGHT_EYE_INNER = 362;
const RIGHT_EYE_OUTER = 263;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_BOTTOM = 374;
const LEFT_IRIS_POINTS = [468, 469, 470, 471, 472];
const RIGHT_IRIS_POINTS = [473, 474, 475, 476, 477];
const NOSE_TIP_INDEX = 1;
const MOUTH_TOP_INDEX = 13;
const MOUTH_BOTTOM_INDEX = 14;
const LEFT_FACE_EDGE_INDEX = 234;
const RIGHT_FACE_EDGE_INDEX = 454;
const FOREHEAD_INDEX = 10;
const CHIN_INDEX = 152;

const ANALYSIS_INTERVAL_MS = 420;
const CALIBRATION_SAMPLE_TARGET = 12;
const HISTORY_LIMIT = 16;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const average = (values = []) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const getStdDev = (values = []) => {
  if (!values.length) {
    return 0;
  }

  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
};

const averagePoint = (points, indices) => {
  const total = indices.reduce(
    (acc, index) => {
      const point = points[index];
      if (!point) {
        return acc;
      }

      return {
        x: acc.x + point.x,
        y: acc.y + point.y,
      };
    },
    { x: 0, y: 0 }
  );

  return {
    x: total.x / indices.length,
    y: total.y / indices.length,
  };
};

const getBlendshapeScore = (blendshapes = [], name) =>
  blendshapes.find((item) => item.categoryName === name)?.score || 0;

const getNormalizedRatio = (value, start, end) => {
  const range = end - start;
  if (Math.abs(range) < 0.0001) {
    return 0.5;
  }

  return clamp((value - start) / range, 0, 1);
};

const getIrisAxisRatios = (iris, eyeLeft, eyeRight, eyeTop, eyeBottom) => ({
  horizontal: getNormalizedRatio(iris.x, eyeLeft.x, eyeRight.x),
  vertical: getNormalizedRatio(iris.y, eyeTop.y, eyeBottom.y),
});

const getToleranceScore = (value, target, tolerance) =>
  clamp(1 - Math.abs(value - target) / Math.max(tolerance, 0.001), 0, 1);

const buildCalibrationBaseline = (samples = []) => ({
  leftHorizontal: average(samples.map((sample) => sample.leftHorizontal)),
  rightHorizontal: average(samples.map((sample) => sample.rightHorizontal)),
  leftVertical: average(samples.map((sample) => sample.leftVertical)),
  rightVertical: average(samples.map((sample) => sample.rightVertical)),
  faceCenterX: average(samples.map((sample) => sample.faceCenterX)),
  faceCenterY: average(samples.map((sample) => sample.faceCenterY)),
  faceWidth: average(samples.map((sample) => sample.faceWidth)),
});

const analyzeLandmarks = ({
  landmarks,
  blendshapes,
  paceWpm = 0,
  calibrationBaseline = null,
  smoothedEyeScore = null,
}) => {
  const leftEyeOuter = landmarks[LEFT_EYE_OUTER];
  const leftEyeInner = landmarks[LEFT_EYE_INNER];
  const leftEyeTop = landmarks[LEFT_EYE_TOP];
  const leftEyeBottom = landmarks[LEFT_EYE_BOTTOM];
  const rightEyeInner = landmarks[RIGHT_EYE_INNER];
  const rightEyeOuter = landmarks[RIGHT_EYE_OUTER];
  const rightEyeTop = landmarks[RIGHT_EYE_TOP];
  const rightEyeBottom = landmarks[RIGHT_EYE_BOTTOM];
  const leftIris = averagePoint(landmarks, LEFT_IRIS_POINTS);
  const rightIris = averagePoint(landmarks, RIGHT_IRIS_POINTS);
  const nose = landmarks[NOSE_TIP_INDEX];
  const mouthTop = landmarks[MOUTH_TOP_INDEX];
  const mouthBottom = landmarks[MOUTH_BOTTOM_INDEX];
  const leftFaceEdge = landmarks[LEFT_FACE_EDGE_INDEX];
  const rightFaceEdge = landmarks[RIGHT_FACE_EDGE_INDEX];
  const forehead = landmarks[FOREHEAD_INDEX];
  const chin = landmarks[CHIN_INDEX];

  if (
    !leftEyeOuter ||
    !leftEyeInner ||
    !leftEyeTop ||
    !leftEyeBottom ||
    !rightEyeInner ||
    !rightEyeOuter ||
    !rightEyeTop ||
    !rightEyeBottom ||
    !nose ||
    !mouthTop ||
    !mouthBottom ||
    !leftFaceEdge ||
    !rightFaceEdge ||
    !forehead ||
    !chin
  ) {
    return {
      faceVisible: false,
      eyeContact: false,
      eyeContactScore: smoothedEyeScore ?? 0,
      trackingConfidence: 0,
      centered: false,
      tense: false,
      stressScore: 34,
      faceAlignmentScore: 0,
      gazeScore: 0,
      calibrationCandidate: null,
      calibrationEligible: false,
      prompt: "Hold still for a second so the camera can map your face.",
    };
  }

  const leftEyeCenter = averagePoint(landmarks, [LEFT_EYE_OUTER, LEFT_EYE_INNER, LEFT_EYE_TOP, LEFT_EYE_BOTTOM]);
  const rightEyeCenter = averagePoint(landmarks, [RIGHT_EYE_INNER, RIGHT_EYE_OUTER, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM]);
  const eyeMidX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
  const faceCenterX = (leftFaceEdge.x + rightFaceEdge.x) / 2;
  const faceCenterY = (forehead.y + chin.y) / 2;
  const faceWidth = Math.max(Math.abs(rightFaceEdge.x - leftFaceEdge.x), 0.001);
  const eyeDistance = Math.max(Math.abs(rightEyeCenter.x - leftEyeCenter.x), 0.001);
  const mouthOpen = Math.abs(mouthBottom.y - mouthTop.y);
  const headTurn = Math.abs(nose.x - eyeMidX) / eyeDistance;
  const headTilt = Math.abs(leftEyeCenter.y - rightEyeCenter.y);

  const leftEyeWidth = Math.max(Math.abs(leftEyeInner.x - leftEyeOuter.x), 0.001);
  const rightEyeWidth = Math.max(Math.abs(rightEyeOuter.x - rightEyeInner.x), 0.001);
  const leftEyeHeight = Math.max(Math.abs(leftEyeBottom.y - leftEyeTop.y), 0.001);
  const rightEyeHeight = Math.max(Math.abs(rightEyeBottom.y - rightEyeTop.y), 0.001);
  const leftEar = leftEyeHeight / leftEyeWidth;
  const rightEar = rightEyeHeight / rightEyeWidth;

  const leftRatios = getIrisAxisRatios(leftIris, leftEyeOuter, leftEyeInner, leftEyeTop, leftEyeBottom);
  const rightRatios = getIrisAxisRatios(rightIris, rightEyeInner, rightEyeOuter, rightEyeTop, rightEyeBottom);

  const blinkLeft = getBlendshapeScore(blendshapes, "eyeBlinkLeft");
  const blinkRight = getBlendshapeScore(blendshapes, "eyeBlinkRight");
  const squintLeft = getBlendshapeScore(blendshapes, "eyeSquintLeft");
  const squintRight = getBlendshapeScore(blendshapes, "eyeSquintRight");

  const eyeOpenScore = clamp(
    average([
      clamp((leftEar - 0.07) / 0.07, 0, 1) * (1 - blinkLeft * 0.8),
      clamp((rightEar - 0.07) / 0.07, 0, 1) * (1 - blinkRight * 0.8),
      1 - average([squintLeft, squintRight]) * 0.55,
    ]),
    0,
    1
  );

  const centeredXScore = calibrationBaseline
    ? getToleranceScore(faceCenterX, calibrationBaseline.faceCenterX, 0.12)
    : getToleranceScore(faceCenterX, 0.5, 0.15);
  const centeredYScore = calibrationBaseline
    ? getToleranceScore(faceCenterY, calibrationBaseline.faceCenterY, 0.12)
    : getToleranceScore(faceCenterY, 0.5, 0.16);
  const centered = centeredXScore >= 0.62 && centeredYScore >= 0.62;

  const turnScore = clamp(1 - headTurn / 0.22, 0, 1);
  const tiltScore = clamp(1 - headTilt / 0.05, 0, 1);
  const distanceScore = calibrationBaseline
    ? getToleranceScore(faceWidth, calibrationBaseline.faceWidth, 0.08)
    : clamp((faceWidth - 0.14) / 0.18, 0, 1);
  const faceAlignmentScore = Math.round(
    average([centeredXScore, centeredYScore, turnScore, tiltScore, distanceScore]) * 100
  );

  const baseline = calibrationBaseline || {
    leftHorizontal: 0.5,
    rightHorizontal: 0.5,
    leftVertical: 0.5,
    rightVertical: 0.5,
  };

  const irisHorizontalScore = average([
    getToleranceScore(leftRatios.horizontal, baseline.leftHorizontal, 0.18),
    getToleranceScore(rightRatios.horizontal, baseline.rightHorizontal, 0.18),
  ]);
  const irisVerticalScore = average([
    getToleranceScore(leftRatios.vertical, baseline.leftVertical, 0.22),
    getToleranceScore(rightRatios.vertical, baseline.rightVertical, 0.22),
  ]);

  const gazeHorizontalDeviation = average([
    Math.max(getBlendshapeScore(blendshapes, "eyeLookInLeft"), getBlendshapeScore(blendshapes, "eyeLookOutLeft")),
    Math.max(getBlendshapeScore(blendshapes, "eyeLookInRight"), getBlendshapeScore(blendshapes, "eyeLookOutRight")),
  ]);
  const gazeVerticalDeviation = average([
    Math.max(getBlendshapeScore(blendshapes, "eyeLookUpLeft"), getBlendshapeScore(blendshapes, "eyeLookDownLeft")),
    Math.max(getBlendshapeScore(blendshapes, "eyeLookUpRight"), getBlendshapeScore(blendshapes, "eyeLookDownRight")),
  ]);
  const blendshapeGazeScore = clamp(1 - (gazeHorizontalDeviation * 1.15 + gazeVerticalDeviation * 0.9), 0, 1);
  const gazeScore = Math.round(
    (irisHorizontalScore * 0.42 + irisVerticalScore * 0.2 + blendshapeGazeScore * 0.38) * 100
  );

  const trackingConfidence = Math.round(
    clamp(
      eyeOpenScore * 0.34 +
        distanceScore * 0.18 +
        centeredXScore * 0.14 +
        centeredYScore * 0.1 +
        turnScore * 0.14 +
        tiltScore * 0.1,
      0,
      1
    ) * 100
  );

  const calibrationCandidate = {
    leftHorizontal: leftRatios.horizontal,
    rightHorizontal: rightRatios.horizontal,
    leftVertical: leftRatios.vertical,
    rightVertical: rightRatios.vertical,
    faceCenterX,
    faceCenterY,
    faceWidth,
  };

  const calibrationEligible =
    eyeOpenScore >= 0.65 &&
    turnScore >= 0.68 &&
    tiltScore >= 0.72 &&
    centeredXScore >= 0.68 &&
    centeredYScore >= 0.64 &&
    distanceScore >= 0.48 &&
    blendshapeGazeScore >= 0.38;

  const rawEyeContactScore = Math.round(
    clamp(
      irisHorizontalScore * 0.28 +
        irisVerticalScore * 0.14 +
        blendshapeGazeScore * 0.22 +
        turnScore * 0.14 +
        tiltScore * 0.08 +
        centeredXScore * 0.08 +
        centeredYScore * 0.03 +
        distanceScore * 0.03,
      0,
      1
    ) * 100
  );

  const browDown =
    getBlendshapeScore(blendshapes, "browDownLeft") + getBlendshapeScore(blendshapes, "browDownRight");
  const jawOpen = getBlendshapeScore(blendshapes, "jawOpen");
  const smile =
    getBlendshapeScore(blendshapes, "mouthSmileLeft") + getBlendshapeScore(blendshapes, "mouthSmileRight");

  const rawStressPenalty =
    browDown * 24 +
    average([squintLeft, squintRight]) * 12 +
    jawOpen * 10 +
    (mouthOpen > 0.06 ? 10 : 0) +
    (paceWpm > 176 ? Math.min(18, (paceWpm - 176) * 0.42) : 0) -
    smile * 10;
  const stressScore = Math.round(clamp(100 - rawStressPenalty, 32, 100));
  const tense = stressScore < 68;

  let prompt = "Good eye contact. Keep speaking naturally.";
  if (eyeOpenScore < 0.45) {
    prompt = "Keep your eyes open and stay facing the camera so tracking can stay accurate.";
  } else if (!calibrationBaseline && calibrationEligible) {
    prompt = "Hold your gaze on the camera for a second while eye tracking calibrates.";
  } else if (distanceScore < 0.45) {
    prompt = "Move a little closer so your eyes stay easy to track.";
  } else if (centeredXScore < 0.6 || centeredYScore < 0.58) {
    prompt = "Center your face in the frame so the eye-tracking score stays steady.";
  } else if (blendshapeGazeScore < 0.55 || irisHorizontalScore < 0.6) {
    prompt = "Look closer to the camera lens instead of the screen.";
  } else if (turnScore < 0.62 || tiltScore < 0.64) {
    prompt = "Keep your head straighter and pointed toward the lens.";
  } else if (tense) {
    prompt = "Your expression looks tense. Relax your face and slow your breathing.";
  } else if (paceWpm > 176) {
    prompt = "You're speaking fast. Slow down and keep your gaze steady.";
  }

  return {
    faceVisible: true,
    eyeContact: rawEyeContactScore >= 76,
    eyeContactScore: rawEyeContactScore,
    trackingConfidence,
    centered,
    tense,
    stressScore,
    faceAlignmentScore,
    gazeScore,
    calibrationCandidate,
    calibrationEligible,
    prompt,
  };
};

export const useWebcamAnalysis = ({ videoRef, cameraOn, liveVoiceMetrics }) => {
  const landmarkerRef = useRef(null);
  const rollingEyeContactScoresRef = useRef([]);
  const rollingStressScoresRef = useRef([]);
  const rollingConfidenceScoresRef = useRef([]);
  const calibrationSamplesRef = useRef([]);
  const calibrationBaselineRef = useRef(null);
  const liveVoiceMetricsRef = useRef(liveVoiceMetrics);
  const smoothedEyeScoreRef = useRef(null);

  const [faceDetectionSupported, setFaceDetectionSupported] = useState(false);
  const [coachingMode, setCoachingMode] = useState("basic");
  const [samples, setSamples] = useState(0);
  const [eyeContactScoreTotal, setEyeContactScoreTotal] = useState(0);
  const [smoothedEyeContactRate, setSmoothedEyeContactRate] = useState(null);
  const [trackingConfidence, setTrackingConfidence] = useState(null);
  const [gazeStability, setGazeStability] = useState(null);
  const [stressScore, setStressScore] = useState(null);
  const [noFaceEvents, setNoFaceEvents] = useState(0);
  const [offCenterEvents, setOffCenterEvents] = useState(0);
  const [stressFlags, setStressFlags] = useState(0);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [calibrated, setCalibrated] = useState(false);
  const [prompts, setPrompts] = useState([]);

  useEffect(() => {
    liveVoiceMetricsRef.current = liveVoiceMetrics;
  }, [liveVoiceMetrics]);

  useEffect(() => {
    smoothedEyeScoreRef.current = smoothedEyeContactRate;
  }, [smoothedEyeContactRate]);

  useEffect(() => {
    if (cameraOn) {
      return;
    }

    landmarkerRef.current?.close?.();
    landmarkerRef.current = null;
    rollingEyeContactScoresRef.current = [];
    rollingStressScoresRef.current = [];
    rollingConfidenceScoresRef.current = [];
    calibrationSamplesRef.current = [];
    calibrationBaselineRef.current = null;

    setFaceDetectionSupported(false);
    setCoachingMode("basic");
    setSamples(0);
    setEyeContactScoreTotal(0);
    setSmoothedEyeContactRate(null);
    setTrackingConfidence(null);
    setGazeStability(null);
    setStressScore(null);
    setNoFaceEvents(0);
    setOffCenterEvents(0);
    setStressFlags(0);
    setCalibrationProgress(0);
    setCalibrated(false);
    setPrompts([]);
  }, [cameraOn]);

  useEffect(() => {
    if (!cameraOn || !videoRef.current) {
      return undefined;
    }

    let cancelled = false;
    let intervalId;

    const runBasicFallback = () => {
      setFaceDetectionSupported(false);
      setCoachingMode("basic");
      setCalibrationProgress(0);
      setCalibrated(false);

      intervalId = window.setInterval(() => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || !video.videoWidth) {
          setPrompts(["Waiting for the camera feed. Keep the tab open and stay centered."]);
          return;
        }

        const nextPrompts = [];
        const paceWpm = liveVoiceMetricsRef.current?.paceWpm || 0;
        if (paceWpm > 176) {
          setStressFlags((count) => count + 1);
          nextPrompts.push("You're speaking a bit fast. Slow down and pause between ideas.");
        }

        if ((liveVoiceMetricsRef.current?.longPauses || 0) > 2) {
          nextPrompts.push("Keep your answers flowing. Short pauses are better than stopping too long.");
        }

        if (!nextPrompts.length) {
          nextPrompts.push("Camera is on. Keep your face centered and look toward the lens.");
        }

        setTrackingConfidence(42);
        setStressScore(paceWpm > 176 ? 62 : 78);
        setPrompts(nextPrompts.slice(-3));
      }, 1800);
    };

    const startLandmarker = async () => {
      try {
        const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
        if (cancelled) {
          return;
        }

        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
        if (cancelled) {
          return;
        }

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: FACE_LANDMARKER_MODEL_URL,
            delegate: "GPU",
          },
          numFaces: 1,
          runningMode: "VIDEO",
          outputFaceBlendshapes: true,
        });

        if (cancelled) {
          landmarker.close?.();
          return;
        }

        landmarkerRef.current = landmarker;
        setFaceDetectionSupported(true);
        setCoachingMode("advanced");
        setPrompts(["Camera ready. Look at the lens for a moment so eye tracking can calibrate."]);

        intervalId = window.setInterval(() => {
          const video = videoRef.current;
          if (!video || video.readyState < 2 || !video.videoWidth) {
            return;
          }

          try {
            const result = landmarker.detectForVideo(video, performance.now());
            const landmarks = result.faceLandmarks?.[0];
            const blendshapes = result.faceBlendshapes?.[0]?.categories || [];

            if (!landmarks?.length) {
              setNoFaceEvents((count) => count + 1);
              setTrackingConfidence((current) => current ?? 0);
              setPrompts((current) => [
                ...current.filter((item) => item !== "Look at the camera more often."),
                "Sit in frame so your face stays visible.",
              ]);
              return;
            }

            const analysis = analyzeLandmarks({
              landmarks,
              blendshapes,
              paceWpm: liveVoiceMetricsRef.current?.paceWpm || 0,
              calibrationBaseline: calibrationBaselineRef.current,
              smoothedEyeScore: smoothedEyeScoreRef.current,
            });

            if (analysis.calibrationEligible && !calibrationBaselineRef.current) {
              calibrationSamplesRef.current = [
                ...calibrationSamplesRef.current.slice(-(CALIBRATION_SAMPLE_TARGET - 1)),
                analysis.calibrationCandidate,
              ];
              const progress = Math.round(
                (calibrationSamplesRef.current.length / CALIBRATION_SAMPLE_TARGET) * 100
              );
              setCalibrationProgress(Math.min(progress, 100));

              if (calibrationSamplesRef.current.length >= CALIBRATION_SAMPLE_TARGET) {
                calibrationBaselineRef.current = buildCalibrationBaseline(calibrationSamplesRef.current);
                setCalibrated(true);
                setCalibrationProgress(100);
                setPrompts((current) => [
                  ...current.filter((item) => item !== "Hold your gaze on the camera for a second while eye tracking calibrates."),
                  "Eye tracking calibrated. Keep your gaze near the lens while you answer.",
                ]);
              }
            } else if (!calibrationBaselineRef.current && !analysis.calibrationEligible) {
              calibrationSamplesRef.current = calibrationSamplesRef.current.slice(-3);
              setCalibrationProgress(
                Math.round((calibrationSamplesRef.current.length / CALIBRATION_SAMPLE_TARGET) * 100)
              );
            }

            rollingConfidenceScoresRef.current = [
              ...rollingConfidenceScoresRef.current.slice(-(HISTORY_LIMIT - 1)),
              analysis.trackingConfidence,
            ];
            setTrackingConfidence(Math.round(average(rollingConfidenceScoresRef.current)));

            setStressScore(() => {
              const nextValues = [...rollingStressScoresRef.current.slice(-(HISTORY_LIMIT - 1)), analysis.stressScore];
              rollingStressScoresRef.current = nextValues;
              return Math.round(average(nextValues));
            });

            if (analysis.trackingConfidence >= 55) {
              setSamples((count) => count + 1);
              setEyeContactScoreTotal((count) => count + analysis.eyeContactScore);

              rollingEyeContactScoresRef.current = [
                ...rollingEyeContactScoresRef.current.slice(-(HISTORY_LIMIT - 1)),
                analysis.eyeContactScore,
              ];

              const smoothedEyeScore = Math.round(average(rollingEyeContactScoresRef.current));
              const stabilityPenalty = Math.min(24, getStdDev(rollingEyeContactScoresRef.current) * 1.3);
              setSmoothedEyeContactRate(smoothedEyeScore);
              setGazeStability(Math.round(clamp(100 - stabilityPenalty, 46, 100)));

              if (!analysis.eyeContact) {
                setOffCenterEvents((count) => count + 1);
              }
            }

            if (analysis.tense || (liveVoiceMetricsRef.current?.paceWpm || 0) > 176) {
              setStressFlags((count) => count + 1);
            }

            setPrompts((current) => {
              const next = current.filter((item) => item !== analysis.prompt);
              next.push(analysis.prompt);
              return [...new Set(next)].slice(-3);
            });
          } catch (error) {
          }
        }, ANALYSIS_INTERVAL_MS);
      } catch (error) {
        runBasicFallback();
      }
    };

    startLandmarker();

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      landmarkerRef.current?.close?.();
      landmarkerRef.current = null;
    };
  }, [
    cameraOn,
    videoRef,
  ]);

  return useMemo(() => {
    const averageEyeContactRate = samples ? Math.round(eyeContactScoreTotal / samples) : null;

    return {
      cameraSupported: cameraOn,
      faceDetectionSupported,
      coachingMode,
      calibrated,
      calibrationProgress,
      eyeContactRate: faceDetectionSupported ? smoothedEyeContactRate ?? averageEyeContactRate : null,
      trackingConfidence,
      gazeStability,
      stressScore,
      noFaceEvents,
      offCenterEvents,
      stressFlags,
      prompts: [...new Set(prompts)].slice(-3),
    };
  }, [
    cameraOn,
    faceDetectionSupported,
    coachingMode,
    calibrated,
    calibrationProgress,
    samples,
    eyeContactScoreTotal,
    smoothedEyeContactRate,
    trackingConfidence,
    gazeStability,
    stressScore,
    noFaceEvents,
    offCenterEvents,
    stressFlags,
    prompts,
  ]);
};
