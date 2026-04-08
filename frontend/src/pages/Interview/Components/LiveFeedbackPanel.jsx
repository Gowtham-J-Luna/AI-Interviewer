import React from "react";

const ScoreCard = ({ label, value, accent }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
    <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">{label}</div>
    <div className="text-2xl font-semibold text-white mt-2" style={{ color: accent || "#ffffff" }}>
      {value}
    </div>
  </div>
);

const LiveFeedbackPanel = ({ voiceMetrics, webcamMetrics }) => {
  const prompts = [...(voiceMetrics?.feedback || []), ...(webcamMetrics?.prompts || [])].slice(0, 4);
  const eyeContactValue =
    typeof webcamMetrics?.eyeContactRate === "number" ? `${webcamMetrics.eyeContactRate}%` : "Detecting";
  const stressValue =
    typeof webcamMetrics?.stressScore === "number" ? `${webcamMetrics.stressScore}/100` : "Tracking";
  const trackingValue =
    typeof webcamMetrics?.trackingConfidence === "number"
      ? `${webcamMetrics.trackingConfidence}%`
      : "Stabilizing";
  const stabilityValue =
    typeof webcamMetrics?.gazeStability === "number" ? `${webcamMetrics.gazeStability}%` : "Learning";
  const fillerHighlights = Object.entries(voiceMetrics?.fillerBreakdown || {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="bg-black border border-white/30 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-8 bg-white/80 rounded-full"></div>
        <span className="text-white text-base font-medium tracking-wide">Live Coaching</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <ScoreCard label="Clarity" value={voiceMetrics?.clarityScore || 0} accent="#ffffff" />
        <ScoreCard label="Grammar" value={voiceMetrics?.grammarScore || 0} accent="#38bdf8" />
        <ScoreCard label="Filler Control" value={voiceMetrics?.fillerScore || 0} accent="#22c55e" />
        <ScoreCard label="Word Accuracy" value={`${voiceMetrics?.speechAccuracy || 0}%`} accent="#f97316" />
        <ScoreCard label="Eye Contact" value={eyeContactValue} accent="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-sm">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-white/80">
          <div className="text-white font-medium mb-2">Speech</div>
          <p>Pace: {voiceMetrics?.paceWpm || 0} WPM</p>
          <p>Words: {voiceMetrics?.wordCount || 0}</p>
          <p>Long pauses: {voiceMetrics?.longPauses || 0}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-white/80">
          <div className="text-white font-medium mb-2">Filler Detection</div>
          {fillerHighlights.length ? (
            fillerHighlights.map(([word, count]) => (
              <p key={word}>
                {word}: {count}
              </p>
            ))
          ) : (
            <p>No major filler words detected yet.</p>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-white/80">
          <div className="text-white font-medium mb-2">Grammar</div>
          {voiceMetrics?.grammarIssues?.length ? (
            voiceMetrics.grammarIssues.slice(0, 3).map((issue, index) => <p key={index}>{issue}</p>)
          ) : (
            <p>No obvious grammar flags so far.</p>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-white/80">
          <div className="text-white font-medium mb-2">Presence</div>
          <p>Eye contact: {eyeContactValue}</p>
          <p>Stress: {stressValue}</p>
          <p>Tracking confidence: {trackingValue}</p>
          <p>Gaze stability: {stabilityValue}</p>
          <p className="text-white/50 text-xs mt-2">
            Mode: {webcamMetrics?.coachingMode === "advanced" ? "Calibrated eye tracking" : "Basic camera coaching"}
          </p>
          <p className="text-white/50 text-xs mt-1">
            {webcamMetrics?.calibrated
              ? "Calibration locked. Scores are based on your current camera position."
              : `Calibrating eye tracking: ${webcamMetrics?.calibrationProgress || 0}%`}
          </p>
        </div>
      </div>

      <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/80">
        <div className="text-white font-medium mb-2">Coaching Prompts</div>
        {prompts.length ? prompts.map((prompt, index) => <p key={index}>{prompt}</p>) : <p>You're steady. Keep going.</p>}
      </div>
    </div>
  );
};

export default LiveFeedbackPanel;
