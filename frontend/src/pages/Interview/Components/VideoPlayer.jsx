import React from "react";
import {
  Mic01Icon,
  MicOff01Icon,
  Camera01Icon,
  CameraOff01Icon,
  ImageFlipHorizontalIcon,
} from "hugeicons-react";

const VideoPlayer = ({
  videoRef,
  cameraOn,
  mirrored,
  setMirrored,
  micOn,
  handleMicToggle,
  handleCameraToggle,
  webcamPrompts = [],
  eyeContactRate = null,
  paceWpm = 0,
  stressScore = null,
  coachingMode = "basic",
  trackingConfidence = null,
  calibrationProgress = 0,
  calibrated = false,
  interviewStarted = false,
  isRecording = false,
  recordingDurationLabel = "",
}) => {
  const latestPrompt = webcamPrompts[webcamPrompts.length - 1];
  const showEyeContact = typeof eyeContactRate === "number";
  const showStress = typeof stressScore === "number";
  const showTrackingConfidence = typeof trackingConfidence === "number";
  const cameraModeLabel =
    coachingMode === "advanced"
      ? calibrated
        ? "Eye Tracking"
        : `Calibrating ${Math.max(0, Math.min(100, calibrationProgress))}%`
      : "Basic Mode";

  return (
    <div className="flex-1 bg-black border border-white/30 rounded-xl p-0 relative flex flex-col min-h-[350px] justify-between overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover rounded-2xl"
        style={{ transform: mirrored ? "scaleX(-1)" : "none" }}
      />

      {!cameraOn && (
        <div className="absolute inset-0 bg-black flex items-center justify-center rounded-2xl">
          <div className="text-white text-center px-6">
            <CameraOff01Icon size={48} className="mx-auto mb-2" />
            <p className="font-medium">Camera is off</p>
            <p className="text-sm text-white/60 mt-2">
              Turn your camera on before you start the interview to enable eye-contact coaching.
            </p>
          </div>
        </div>
      )}

      {cameraOn && (
        <div className="absolute top-6 right-6 max-w-xs space-y-2">
          <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-white shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Camera Coaching</div>
              <span className="px-2 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] uppercase tracking-[0.15em] text-white/70">
                {cameraModeLabel}
              </span>
            </div>
            <p className="text-sm font-medium mt-2">
              {latestPrompt || "You're framed well. Keep a steady gaze on the camera."}
            </p>

            <div className="flex items-center gap-2 text-xs text-white/60 mt-3 flex-wrap">
              {showEyeContact && (
                <span className="px-2 py-1 rounded-full bg-white/10 border border-white/10">
                  Eye contact {eyeContactRate}%
                </span>
              )}
              {showStress && (
                <span className="px-2 py-1 rounded-full bg-white/10 border border-white/10">
                  Stress {stressScore}/100
                </span>
              )}
              {showTrackingConfidence && (
                <span className="px-2 py-1 rounded-full bg-white/10 border border-white/10">
                  Tracking {trackingConfidence}%
                </span>
              )}
              <span className="px-2 py-1 rounded-full bg-white/10 border border-white/10">
                Pace {paceWpm} WPM
              </span>
            </div>
          </div>
        </div>
      )}

      <div
        className="absolute bottom-4 right-4 flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-3"
        style={{
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        }}
      >
        <button
          onClick={handleMicToggle}
          className={`w-10 h-10 flex items-center justify-center rounded-full border ${
            micOn ? "border-white/30 text-white hover:bg-white/10" : "border-red-500/50 text-red-500"
          } cursor-pointer transition-all duration-200 hover:scale-105`}
          title={micOn ? "Turn mic off" : "Turn mic on"}
        >
          {micOn ? <Mic01Icon size={20} /> : <MicOff01Icon size={20} />}
        </button>

        <button
          onClick={handleCameraToggle}
          className={`w-10 h-10 flex items-center justify-center rounded-full border ${
            cameraOn ? "border-white/30 text-white hover:bg-white/10" : "border-amber-500/50 text-amber-500"
          } cursor-pointer transition-all duration-200 hover:scale-105`}
          title={cameraOn ? "Turn camera off" : "Turn camera on"}
        >
          {cameraOn ? <Camera01Icon size={20} /> : <CameraOff01Icon size={20} />}
        </button>

        <button
          onClick={() => setMirrored((prev) => !prev)}
          className={`w-10 h-10 flex items-center justify-center cursor-pointer rounded-full border border-white/30 text-white transition-all duration-200 hover:scale-105 ${
            mirrored ? "bg-white/10" : ""
          }`}
          title="Flip Camera View"
        >
          <ImageFlipHorizontalIcon size={20} />
        </button>
      </div>

      {isRecording && (
        <div className="absolute top-6 left-6 flex items-center gap-2 bg-red-500/90 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full" />
          REC {recordingDurationLabel ? `· ${recordingDurationLabel}` : ""}
        </div>
      )}

      <span className="absolute left-6 bottom-4 text-white mb-2 text-sm">
        {interviewStarted ? "Interview Live" : "Preview"}
        {isRecording && <span className="text-red-400"> · Recording</span>}
      </span>
    </div>
  );
};

export default VideoPlayer;
