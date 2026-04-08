import React, { useCallback, useEffect, useMemo, useState } from "react";
import axiosInstance from "../../../utils/axiosInstance.js";
import { API_PATHS } from "../../../constants/apiPaths.js";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Home01Icon, ArrowDown01Icon, CheckmarkCircle02Icon } from "hugeicons-react";
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

const SessionInterview = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterResumeSessions = searchParams.get("isResumeSession") === "true";
  const preselectedSessionId = searchParams.get("sessionId");
  const [mirrored, setMirrored] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedSessionData, setSelectedSessionData] = useState(null);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [responsesByQuestion, setResponsesByQuestion] = useState({});
  const [isSavingAttempt, setIsSavingAttempt] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [isPreparingInterview, setIsPreparingInterview] = useState(false);
  const [recordingTimerMs, setRecordingTimerMs] = useState(0);
  const [recordingStartedAt, setRecordingStartedAt] = useState(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.SESSION.GET_ALL);
        let sessionsList = res.data || [];
        if (filterResumeSessions) {
          sessionsList = sessionsList.filter((session) => session.isResumeSession);
        }
        setSessions(sessionsList);
      } catch (err) {
        setSessions([]);
      }
    };
    fetchSessions();
  }, [filterResumeSessions]);

  useEffect(() => {
    if (!sessions.length || selectedSession) {
      return;
    }

    const matchingSession = preselectedSessionId
      ? sessions.find((session) => session._id === preselectedSessionId)
      : null;

    if (matchingSession) {
      setSelectedSession(matchingSession._id);
    } else if (sessions.length === 1) {
      setSelectedSession(sessions[0]._id);
    }
  }, [sessions, selectedSession, preselectedSessionId]);

  useEffect(() => {
    if (!selectedSession) {
      setSelectedSessionData(null);
      setSessionQuestions([]);
      setCurrentQuestion("");
      setResponsesByQuestion({});
      setInterviewStarted(false);
      setRecordingStartedAt(null);
      return;
    }

    const fetchSessionQuestions = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.SESSION.GET_ONE(selectedSession));
        const session = res.data?.session || null;
        const questions = Array.isArray(session?.questions)
          ? session.questions.map((question) => question.question)
          : [];

        setSelectedSessionData(session);
        setSessionQuestions(questions);
        setCurrentQuestion(questions.length > 0 ? questions[0] : "");
        setResponsesByQuestion({});
        setInterviewStarted(false);
        setRecordingStartedAt(null);
      } catch (err) {
        setSelectedSessionData(null);
        setSessionQuestions([]);
        setCurrentQuestion("");
        setInterviewStarted(false);
        setRecordingStartedAt(null);
      }
    };

    fetchSessionQuestions();
  }, [selectedSession]);

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

  const { isRecording, recordedChunks, startRecording, stopRecording, resetRecording } =
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
    resetKey: `${selectedSession || "none"}-${currentQuestion || "none"}`,
  });

  const webcamMetrics = useWebcamAnalysis({
    videoRef,
    cameraOn,
    liveVoiceMetrics,
  });

  const questionIndex = useMemo(
    () => Math.max(0, sessionQuestions.findIndex((question) => question === currentQuestion)),
    [sessionQuestions, currentQuestion]
  );
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
        options.includeIntro ? `Session interview starting. First question. ${question}` : question
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
      setTimeout(() => {
        manualRestart();
      }, 2000);
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
          toast.success("Camera not detected, so this run will use audio coaching without eye-contact scoring.");
        }
      }

      if (!mediaReady) {
        toast.error("Please allow camera and microphone access before starting the interview.");
        return;
      }

      await wait(700);
      const recordingStarted = await startRecording();
      if (!recordingStarted) {
        toast.error("Interview started, but the session recording could not begin. Check media permissions and try again.");
      }

      setRecordingStartedAt(recordingStarted ? Date.now() : null);
      setInterviewStarted(true);

      window.setTimeout(() => {
        speakQuestion(currentQuestion, { includeIntro: true });
      }, 900);

      toast.success("Session interview started. Listen to the prompt, then begin your answer.");
    } catch (error) {
      toast.error("Failed to start the interview flow.");
    } finally {
      setIsPreparingInterview(false);
    }
  };

  const handleFinishAndSave = async () => {
    const nextResponses = mergeCurrentResponse();
    const questionsAsked = Object.values(nextResponses);

    if (!questionsAsked.length) {
      toast.error("Record at least one answer before saving this practice session.");
      return;
    }

    setIsSavingAttempt(true);

    try {
      if (isRecording) {
        await stopRecording();
      }
      setRecordingStartedAt(null);

      const payload = buildAttemptPayload({
        sessionId: selectedSessionData?._id || null,
        sessionType: selectedSessionData?.isResumeSession ? "resume-session" : "session",
        role: selectedSessionData?.role || "Session Practice",
        jobDescription: selectedSessionData?.jobDescription || "",
        resumeSnapshot: {
          text: selectedSessionData?.resumeTextSnapshot || "",
          data: selectedSessionData?.resumeData || {},
        },
        questionsAsked,
        webcamMetrics,
        analysis,
      });

      await axiosInstance.post(API_PATHS.ATTEMPTS.CREATE, payload);
      toast.success("Practice session saved to history.");
      handleNavigation("/history");
    } catch (error) {
      toast.error(getRequestErrorMessage(error, "Failed to save this practice session."));
    } finally {
      setIsSavingAttempt(false);
    }
  };

  const sessionLabel = useMemo(() => {
    if (!selectedSession) {
      return "Select a session to begin";
    }

    const session = sessions.find((item) => item._id === selectedSession);
    const displayRole = session?.role || session?.resumeData?.inferredRole || (session?.isResumeSession ? "Resume Interview" : "Interview");
    return (
      displayRole +
      (session?.topicsToFocus ? " | " + session.topicsToFocus : "")
    );
  }, [selectedSession, sessions]);

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
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="theme-surface-strong flex items-center justify-between min-w-[300px] p-4 rounded-xl border font-medium transition-all duration-300 hover:opacity-95 cursor-pointer"
                  style={{ color: "var(--app-text)", borderColor: "var(--app-border)" }}
                >
                  <span className="truncate pr-8">{sessionLabel}</span>
                  <ArrowDown01Icon
                    size={18}
                    className={`transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isDropdownOpen && (
                  <div
                    className="theme-surface-strong absolute top-full left-0 mt-2 w-full border rounded-xl overflow-hidden shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{ borderColor: "var(--app-border)" }}
                  >
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                      {sessions.length === 0 ? (
                        <div className="p-4 text-sm text-center italic theme-text-muted">No sessions found</div>
                      ) : (
                        sessions.map((session) => (
                          <div
                            key={session._id}
                            onClick={() => {
                              setSelectedSession(session._id);
                              setIsDropdownOpen(false);
                            }}
                            className={`p-4 text-sm transition-colors cursor-pointer border-b last:border-0 ${
                              selectedSession === session._id ? "theme-surface-soft" : ""
                            }`}
                            style={{
                              borderColor: "var(--app-border)",
                              color:
                                selectedSession === session._id
                                  ? "var(--app-text)"
                                  : "var(--app-text-muted)",
                            }}
                          >
                            <div className="font-semibold">
                              {session.role || session.resumeData?.inferredRole || "Resume Interview"}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {isDropdownOpen && (
                  <div className="fixed inset-0 z-[90] cursor-default" onClick={() => setIsDropdownOpen(false)} />
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleFinishAndSave}
                disabled={isSavingAttempt || !selectedSessionData}
                className="flex items-center gap-2 px-5 py-3 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: "var(--app-text)", color: "var(--app-bg)" }}
              >
                <CheckmarkCircle02Icon size={20} />
                {isSavingAttempt ? "Saving..." : "Finish & Save"}
              </button>
              <button
                onClick={() => handleNavigation("/dashboard")}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white border border-red-500 rounded-full transition-all duration-300 font-semibold hover:bg-red-700 hover:border-red-600 active:scale-95 cursor-pointer"
              >
                <Home01Icon size={20} color="#ffffff" />
                Exit Session
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
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

            <div className="flex flex-col flex-[0.9] gap-6 min-h-[350px]">
              <QuestionPanel
                currentQuestion={currentQuestion}
                setCurrentQuestion={handleNewQuestion}
                setTranscript={setTranscript}
                setInterimTranscript={setInterimTranscript}
                questions={sessionQuestions}
                interviewStarted={interviewStarted}
                isPreparingInterview={isPreparingInterview}
                onStartInterview={handleStartInterview}
                onRepeatQuestion={() => speakQuestion(currentQuestion)}
                questionIndex={questionIndex}
                totalQuestions={sessionQuestions.length}
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
            currentQuestion={currentQuestion}
            transcript={transcript}
            analysis={analysis}
            isAnalyzing={isAnalyzing}
            analysisError={analysisError}
            onAnalyzeTranscript={analyzeTranscript}
            recordingMeta={null}
          />
        </div>
      </div>
    </>
  );
};

export default SessionInterview;
