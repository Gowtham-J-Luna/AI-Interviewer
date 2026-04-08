import React from "react";
import { PlayCircleIcon, VolumeHighIcon, ArrowRight01Icon } from "hugeicons-react";

const QuestionPanel = ({
  currentQuestion,
  setCurrentQuestion,
  setTranscript,
  setInterimTranscript,
  questions = [],
  interviewStarted = false,
  isPreparingInterview = false,
  onStartInterview,
  onRepeatQuestion,
  questionIndex = 0,
  totalQuestions = 0,
}) => {
  const handleNextQuestion = () => {
    if (!questions.length) return;
    const idx = questions.findIndex((q) => q === currentQuestion);
    const nextIdx = idx >= 0 && idx < questions.length - 1 ? idx + 1 : 0;
    setCurrentQuestion(questions[nextIdx]);
    setTranscript("");
    setInterimTranscript("");
  };

  const progressLabel =
    totalQuestions > 0 ? `Question ${Math.min(questionIndex + 1, totalQuestions)} of ${totalQuestions}` : "Question";

  return (
    <div className="bg-black border border-white/30 rounded-xl p-6 flex flex-col justify-center min-h-[180px] relative">
      <div className="flex justify-between items-start mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-white/80 rounded-full"></div>
          <div>
            <span className="text-white text-sm block">Current Question</span>
            <span className="text-white/45 text-xs uppercase tracking-[0.18em]">{progressLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {!interviewStarted && onStartInterview ? (
            <button
              onClick={onStartInterview}
              disabled={isPreparingInterview || !currentQuestion}
              className="inline-flex items-center gap-2 text-black text-sm bg-white hover:bg-gray-100 px-4 py-2 rounded-full cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <PlayCircleIcon size={18} />
              {isPreparingInterview ? "Starting..." : "Start Interview"}
            </button>
          ) : (
            <>
              {onRepeatQuestion && (
                <button
                  onClick={onRepeatQuestion}
                  className="inline-flex items-center gap-2 text-white text-xs bg-white/10 hover:bg-white/15 px-3 py-2 rounded-full cursor-pointer"
                  disabled={!currentQuestion}
                >
                  <VolumeHighIcon size={16} />
                  Repeat Question
                </button>
              )}
              <button
                onClick={handleNextQuestion}
                className="inline-flex items-center gap-2 text-white text-xs bg-green-500 hover:bg-green-600 px-3 py-2 rounded-full cursor-pointer"
                disabled={!questions.length}
                style={{
                  opacity: !questions.length ? 0.5 : 1,
                  cursor: !questions.length ? "not-allowed" : "pointer",
                }}
              >
                <ArrowRight01Icon size={16} />
                Next Question
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-white/90 text-base leading-relaxed min-h-[56px]">
        {currentQuestion || <span className="text-white/50">Select a session to load questions</span>}
      </p>

      <div className="mt-4 text-xs text-white/55">
        {interviewStarted
          ? "The question will be read aloud. Answer naturally while the transcript and coaching update live."
          : "Use Start Interview to turn on the guided flow, voice prompt, transcript capture, and session recording."}
      </div>
    </div>
  );
};

export default QuestionPanel;
