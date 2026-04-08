import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home01Icon, CheckmarkCircle02Icon } from "hugeicons-react";
import toast from "react-hot-toast";
import Navbar from "../../Navbar/Navbar.jsx";
import { useMediaStream } from "../hooks/useMediaStream.js";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { useMediaRecorder } from "../hooks/useMediaRecorder.js";
import { useTranscriptAnalysis } from "../hooks/useTranscriptAnalysis.js";
import { useLiveInterviewCoach } from "../hooks/useLiveInterviewCoach.js";
import { useWebcamAnalysis } from "../hooks/useWebcamAnalysis.js";
import { buildAttemptPayload } from "../Utils/attemptPayload.js";
import VideoPlayer from "../Components/VideoPlayer.jsx";
import QuestionPanel from "../Components/QuestionPanel.jsx";
import TranscriptPanel from "../Components/TranscriptPanel.jsx";
import AnalysisPanel from "../Components/AnalysisPanel.jsx";
import PermissionModal from "../Components/PermissionModal.jsx";
import LiveFeedbackPanel from "../Components/LiveFeedbackPanel.jsx";
import { interviewQuestions } from "../Utils/questions.js";
import axiosInstance from "../../../utils/axiosInstance.js";
import { API_PATHS } from "../../../constants/apiPaths.js";

const toPersistedVoiceMetrics = (metrics) => ({
  fillerWords: metrics?.fillerWords || 0,
  longPauses: metrics?.longPauses || 0,
  grammarIssues: metrics?.grammarIssues?.length || 0,
  paceWpm: metrics?.paceWpm || 0,
  transcriptAccuracy: metrics?.speechAccuracy || 0,
  fillerScore: metrics?.fillerScore || 0,
  grammarScore: metrics?.grammarScore || 0,
  clarityScore: metrics?.clarityScore || 0,
  overallScore: metrics?.overallScore || 0,
});

const getMergedTranscript = (transcript = "", interimTranscript = "") =>
  `${transcript} ${interimTranscript}`.replace(/\s+/g, " ").trim();

const getRequestErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message || error?.message || fallbackMessage;

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const formatDuration = (durationMs = 0) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const buildFallbackAnalysis = ({ role, questionsAsked, voiceMetrics, webcamMetrics }) => {
  const scoreOutOfTen = Number((((voiceMetrics?.overallScore || 0) + (webcamMetrics?.eyeContactRate || 0)) / 20).toFixed(1));
  const fillerWords = voiceMetrics?.fillerWords || 0;
  const grammarIssues = voiceMetrics?.grammarIssues || 0;
  const paceWpm = voiceMetrics?.paceWpm || 0;
  const strengths = [];
  const improvements = [];
  const keyTakeaways = [];

  if ((voiceMetrics?.clarityScore || 0) >= 72) {
    strengths.push("Your answer stayed understandable and reasonably structured.");
  }
  if ((voiceMetrics?.transcriptAccuracy || 0) >= 82) {
    strengths.push("Your spoken words were captured clearly, which usually means your diction was strong.");
  }
  if ((webcamMetrics?.eyeContactRate || 0) >= 70) {
    strengths.push("You maintained good eye contact with the camera for much of the answer.");
  }

  if (fillerWords >= 4) {
    improvements.push("Reduce filler words and use short silent pauses instead.");
  }
  if (grammarIssues >= 2) {
    improvements.push("Use shorter, cleaner sentences so the answer sounds more polished.");
  }
  if (paceWpm > 176) {
    improvements.push("Slow down a little so the answer feels more controlled.");
  }
  if ((webcamMetrics?.stressScore || 100) < 68) {
    improvements.push("Relax your face and shoulders so your delivery feels more confident on camera.");
  }

  if (!strengths.length) {
    strengths.push("You completed the answer and captured enough content for review.");
  }
  if (!improvements.length) {
    improvements.push("Keep adding concrete examples to make the answer more memorable.");
  }

  keyTakeaways.push(`Completed ${questionsAsked.length} interview answer${questionsAsked.length === 1 ? "" : "s"} in this practice run.`);
  keyTakeaways.push(`Average speech accuracy was ${voiceMetrics?.transcriptAccuracy || 0}% with eye contact around ${webcamMetrics?.eyeContactRate || 0}%.`);

  return {
    score: scoreOutOfTen,
    strengths,
    improvements,
    keyTakeaways,
    overallFeedback: `This ${role || "mock interview"} session is saved with transcript, recording, and coaching metrics. Keep your next round tighter, slower, and more example-driven.`,
    refinedAnswer: questionsAsked
      .map((entry, index) => `Q${index + 1}: ${entry.question}\nA: ${entry.transcript}`)
      .join("\n\n"),
  };
};

const Record = () => {
  const navigate = useNavigate();
  const [mirrored, setMirrored] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(
    "Tell me about yourself and why you're interested in this position."
  );
  const [responsesByQuestion, setResponsesByQuestion] = useState({});
  const [isSavingAttempt, setIsSavingAttempt] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [isPreparingInterview, setIsPreparingInterview] = useState(false);
  const [recordingTimerMs, setRecordingTimerMs] = useState(0);
  const [recordingStartedAt, setRecordingStartedAt] = useState(null);

  const {
    videoRef,
    micOn,
    cameraOn,
    permissionGranted,
    errorMessage,
    audioOnly,
    showAudioOnlyNotice,
    hasAttemptedMediaAccess,
    deviceAvailability,
    requestMedia,
    handleMicToggle,
    handleCameraToggle,
    stopAllMediaTracks,
    retryPermissions,
    dismissAudioOnlyNotice,
  } = useMediaStream();

  const {
    transcript,
    interimTranscript,
    isListening,
    speechSupported,
    accuracy,
    language,
    error: speechError,
    stopSpeechRecognition,
    clearTranscript,
    downloadTranscript,
    correctTranscript,
    changeLanguage,
    setTranscript,
    setInterimTranscript,
    manualRestart,
  } = useSpeechRecognition(micOn);

  const { isRecording, recordedChunks, recordingMeta, startRecording, stopRecording, resetRecording } =
    useMediaRecorder(videoRef);

  const {
    analysis,
    isAnalyzing,
    error: analysisError,
    analyzeTranscript,
    clearAnalysis,
  } = useTranscriptAnalysis();

  const { metrics: liveVoiceMetrics, elapsedMs } = useLiveInterviewCoach({
    transcript,
    interimTranscript,
    micOn,
    isListening,
    speechAccuracy: accuracy,
    resetKey: currentQuestion,
  });

  const webcamMetrics = useWebcamAnalysis({
    videoRef,
    cameraOn,
    liveVoiceMetrics,
  });

  const questionIndex = useMemo(
    () => Math.max(0, interviewQuestions.findIndex((question) => question === currentQuestion)),
    [currentQuestion]
  );

  const mergedTranscript = getMergedTranscript(transcript, interimTranscript);
  const recordingDurationLabel = recordingStartedAt ? formatDuration(recordingTimerMs) : "";

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "auto";
    return () => {
      document.body.style.overflow = originalOverflow;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!isRecording || !recordingStartedAt) {
      setRecordingTimerMs(0);
      return undefined;
    }

    const interval = window.setInterval(() => {
      setRecordingTimerMs(Date.now() - recordingStartedAt);
    }, 500);

    return () => window.clearInterval(interval);
  }, [isRecording, recordingStartedAt]);

  const speakQuestion = useCallback(
    (question, options = {}) => {
      if (typeof window === "undefined" || !window.speechSynthesis || !question) {
        return;
      }

      stopSpeechRecognition();
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        options.includeIntro ? `Interview starting. First question. ${question}` : question
      );
      utterance.lang = language || "en-US";
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.onend = () => {
        if (micOn && speechSupported) {
          window.setTimeout(() => {
            manualRestart();
          }, 350);
        }
      };
      window.speechSynthesis.speak(utterance);
    },
    [language, manualRestart, micOn, speechSupported, stopSpeechRecognition]
  );

  const handleNavigation = (path) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopAllMediaTracks();
    navigate(path);
  };

  const handleMicToggleWithRestart = async () => {
    await handleMicToggle();
    if (!micOn && speechSupported) {
      window.setTimeout(() => {
        manualRestart();
      }, 1800);
    }
  };

  const mergeCurrentResponse = useCallback(() => {
    const normalizedTranscript = getMergedTranscript(transcript, interimTranscript);
    if (!currentQuestion || !normalizedTranscript) {
      return responsesByQuestion;
    }

    const nextResponses = {
      ...responsesByQuestion,
      [currentQuestion]: {
        question: currentQuestion,
        transcript: normalizedTranscript,
        durationMs: elapsedMs,
        voiceMetrics: toPersistedVoiceMetrics(liveVoiceMetrics),
      },
    };

    setResponsesByQuestion(nextResponses);
    return nextResponses;
  }, [currentQuestion, elapsedMs, interimTranscript, liveVoiceMetrics, responsesByQuestion, transcript]);

  const handleNewQuestion = (newQuestion) => {
    mergeCurrentResponse();
    setCurrentQuestion(newQuestion);
    setTranscript("");
    setInterimTranscript("");
    clearAnalysis();

    if (interviewStarted) {
      window.setTimeout(() => {
        speakQuestion(newQuestion);
      }, 350);
    }
  };

  const handleStartInterview = async () => {
    if (!currentQuestion) {
      toast.error("No question is loaded yet.");
      return;
    }

    setIsPreparingInterview(true);
    setResponsesByQuestion({});
    clearTranscript();
    clearAnalysis();
    resetRecording();
    setInterviewStarted(false);

    try {
      let mediaReady = await requestMedia({ wantsAudio: true, wantsVideo: true });

      if (!mediaReady && deviceAvailability.hasAudioInput && !deviceAvailability.hasVideoInput) {
        mediaReady = await requestMedia({ wantsAudio: true, wantsVideo: false });
        if (mediaReady) {
          toast.success("Camera not detected, so this run will save audio and transcript without eye-contact scoring.");
        }
      }

      if (!mediaReady) {
        toast.error("Please allow camera and microphone access before starting the interview.");
        return;
      }

      await wait(700);
      const recordingStarted = await startRecording();
      if (!recordingStarted) {
        toast.error("The interview started, but video recording could not begin. Check camera permissions and try again.");
      }

      setRecordingStartedAt(recordingStarted ? Date.now() : null);
      setInterviewStarted(true);

      window.setTimeout(() => {
        speakQuestion(currentQuestion, { includeIntro: true });
      }, 900);

      toast.success("Interview started. Listen to the question, then begin your answer.");
    } catch (error) {
      toast.error("Failed to start the interview flow.");
    } finally {
      setIsPreparingInterview(false);
    }
  };

  const uploadRecordingIfNeeded = async (recordingBlob, meta) => {
    if (!recordingBlob) {
      return meta ? { ...meta } : null;
    }

    const formData = new FormData();
    formData.append("recording", recordingBlob, `mock-interview-${Date.now()}.webm`);

    const response = await axiosInstance.post(API_PATHS.ATTEMPTS.UPLOAD_RECORDING, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return {
      ...(response.data?.recording || {}),
      durationMs: meta?.durationMs || 0,
      startedAt: meta?.startedAt || null,
      endedAt: meta?.endedAt || null,
    };
  };

  const getSessionAnalysisSnapshot = async (questionsAsked) => {
    if (analysis) {
      return analysis;
    }

    const combinedTranscriptText = questionsAsked
      .map((entry, index) => `Question ${index + 1}: ${entry.question}\nAnswer: ${entry.transcript}`)
      .join("\n\n");

    if (combinedTranscriptText.trim().length >= 80) {
      try {
        const response = await axiosInstance.post(API_PATHS.AI.ANALYZE_TRANSCRIPT, {
          question: `Overall mock interview summary for HR practice`,
          transcript: combinedTranscriptText,
        });

        if (response.data) {
          return response.data;
        }
      } catch (error) {
      }
    }

    return buildFallbackAnalysis({
      role: "HR Mock Interview",
      questionsAsked,
      voiceMetrics: {
        overallScore: averageScore(questionsAsked, "overallScore"),
        clarityScore: averageScore(questionsAsked, "clarityScore"),
        transcriptAccuracy: averageScore(questionsAsked, "transcriptAccuracy"),
        fillerWords: averageScore(questionsAsked, "fillerWords"),
        grammarIssues: averageScore(questionsAsked, "grammarIssues"),
        paceWpm: averageScore(questionsAsked, "paceWpm"),
      },
      webcamMetrics,
    });
  };

  const averageScore = (questionsAsked, key) => {
    const values = questionsAsked.map((entry) => entry.voiceMetrics?.[key] || 0).filter(Boolean);
    if (!values.length) {
      return 0;
    }
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  };

  const handleFinishAndSave = async () => {
    const nextResponses = mergeCurrentResponse();
    const questionsAsked = Object.values(nextResponses);

    if (!questionsAsked.length) {
      toast.error("Answer at least one question before saving.");
      return;
    }

    setIsSavingAttempt(true);

    try {
      const finalRecordingResult = isRecording
        ? await stopRecording()
        : { blob: recordedChunks[0] || null, meta: recordingMeta };
      setRecordingStartedAt(null);

      const analysisSnapshot = await getSessionAnalysisSnapshot(questionsAsked);
      const sessionTranscript = questionsAsked
        .map((entry, index) => `Q${index + 1}: ${entry.question}\nA: ${entry.transcript}`)
        .join("\n\n");

      const reportResponse = await axiosInstance.post(API_PATHS.AI.GENERATE_PDF_DATA, {
        analysis: analysisSnapshot,
        question: `HR Mock Interview Summary (${questionsAsked.length} question${questionsAsked.length === 1 ? "" : "s"})`,
        transcript: sessionTranscript,
        userInfo: {
          role: "HR Mock Interview",
        },
      });

      const recordingPayload = await uploadRecordingIfNeeded(
        finalRecordingResult?.blob,
        finalRecordingResult?.meta
      );

      const payload = buildAttemptPayload({
        sessionId: null,
        sessionType: "hr-practice",
        role: "HR Mock Interview",
        jobDescription: "",
        resumeSnapshot: { text: "", data: {} },
        questionsAsked,
        webcamMetrics,
        analysis: analysisSnapshot,
        recording: recordingPayload,
        report: {
          generatedAt: new Date().toISOString(),
          question: `HR Mock Interview Summary (${questionsAsked.length} question${questionsAsked.length === 1 ? "" : "s"})`,
          transcript: sessionTranscript,
          pdfData: reportResponse.data?.data || null,
          analysisSnapshot,
        },
        interviewMeta: {
          startedAt: finalRecordingResult?.meta?.startedAt || null,
          endedAt: finalRecordingResult?.meta?.endedAt || new Date().toISOString(),
          questionsCompleted: questionsAsked.length,
        },
      });

      await axiosInstance.post(API_PATHS.ATTEMPTS.CREATE, payload);
      toast.success("Practice session saved with transcript, report, and recording.");
      handleNavigation("/history");
    } catch (error) {
      toast.error(getRequestErrorMessage(error, "Failed to save this practice session."));
    } finally {
      setIsSavingAttempt(false);
    }
  };

  return (
    <>
      <div className="min-h-screen w-full px-4 py-6 overflow-auto bg-dots-dark">
        <Navbar />

        <PermissionModal
          permissionGranted={permissionGranted}
          errorMessage={errorMessage}
          audioOnly={audioOnly}
          showAudioOnlyNotice={showAudioOnlyNotice}
          hasAttemptedMediaAccess={hasAttemptedMediaAccess}
          retryPermissions={retryPermissions}
          dismissAudioOnlyNotice={dismissAudioOnlyNotice}
        />

        <div className="max-w-[90rem] mt-24 mx-auto flex flex-col gap-6 pb-8">
          <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
            <div>
              <h1 className="text-white text-2xl font-bold">HR Mock Interview</h1>
              <p className="text-white/55 text-sm mt-1">
                Start the interview to hear the question aloud, capture video and transcript, and save the full report.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleFinishAndSave}
                disabled={isSavingAttempt}
                className="flex items-center gap-2 px-5 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <CheckmarkCircle02Icon size={20} />
                {isSavingAttempt ? "Saving..." : "Finish Interview & Save"}
              </button>
              <button
                onClick={() => handleNavigation("/dashboard")}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white border border-red-500 rounded-full transition-all duration-300 font-semibold hover:bg-red-700 hover:border-red-600 active:scale-95 cursor-pointer"
              >
                <Home01Icon size={20} />
                Exit Session
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
            <VideoPlayer
              videoRef={videoRef}
              cameraOn={cameraOn}
              mirrored={mirrored}
              setMirrored={setMirrored}
              micOn={micOn}
              handleMicToggle={handleMicToggleWithRestart}
              handleCameraToggle={handleCameraToggle}
              webcamPrompts={webcamMetrics?.prompts}
              eyeContactRate={webcamMetrics?.eyeContactRate}
              stressScore={webcamMetrics?.stressScore}
              paceWpm={liveVoiceMetrics?.paceWpm}
              coachingMode={webcamMetrics?.coachingMode}
              trackingConfidence={webcamMetrics?.trackingConfidence}
              calibrationProgress={webcamMetrics?.calibrationProgress}
              calibrated={webcamMetrics?.calibrated}
              interviewStarted={interviewStarted}
              isRecording={isRecording}
              recordingDurationLabel={recordingDurationLabel}
            />

            <div className="flex flex-col gap-6 min-h-[350px]">
              <QuestionPanel
                currentQuestion={currentQuestion}
                setCurrentQuestion={handleNewQuestion}
                setTranscript={setTranscript}
                setInterimTranscript={setInterimTranscript}
                questions={interviewQuestions}
                interviewStarted={interviewStarted}
                isPreparingInterview={isPreparingInterview}
                onStartInterview={handleStartInterview}
                onRepeatQuestion={() => speakQuestion(currentQuestion)}
                questionIndex={questionIndex}
                totalQuestions={interviewQuestions.length}
              />

              <TranscriptPanel
                transcript={transcript}
                interimTranscript={interimTranscript}
                speechSupported={speechSupported}
                micOn={micOn}
                isListening={isListening}
                accuracy={accuracy}
                language={language}
                clearTranscript={clearTranscript}
                downloadTranscript={downloadTranscript}
                correctTranscript={correctTranscript}
                changeLanguage={changeLanguage}
                currentQuestion={currentQuestion}
                speechError={speechError}
                manualRestart={manualRestart}
              />
            </div>
          </div>

          <LiveFeedbackPanel voiceMetrics={liveVoiceMetrics} webcamMetrics={webcamMetrics} />

          <AnalysisPanel
            recordedChunks={recordedChunks}
            recordingMeta={recordingMeta || (recordingStartedAt ? { durationMs: recordingTimerMs } : null)}
            currentQuestion={currentQuestion}
            transcript={mergedTranscript}
            analysis={analysis}
            isAnalyzing={isAnalyzing}
            analysisError={analysisError}
            onAnalyzeTranscript={analyzeTranscript}
            reportSaved={isSavingAttempt}
          />
        </div>
      </div>
    </>
  );
};

export default Record;
