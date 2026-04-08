const average = (values = []) =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

export const buildAttemptPayload = ({
  sessionId = null,
  sessionType = "session",
  role = "",
  jobDescription = "",
  resumeSnapshot = { text: "", data: {} },
  questionsAsked = [],
  webcamMetrics = {},
  analysis = null,
  recording = null,
  report = null,
  interviewMeta = null,
}) => {
  const normalizedQuestions = questionsAsked
    .map((entry) => ({
      ...entry,
      transcript: entry?.transcript?.trim?.() || "",
    }))
    .filter((entry) => entry.question && entry.transcript);

  const questionVoiceMetrics = normalizedQuestions.map((entry) => entry.voiceMetrics || {});

  const voiceMetrics = {
    fillerWords: average(questionVoiceMetrics.map((metric) => metric.fillerWords || 0)),
    longPauses: average(questionVoiceMetrics.map((metric) => metric.longPauses || 0)),
    grammarIssues: average(questionVoiceMetrics.map((metric) => metric.grammarIssues || 0)),
    paceWpm: average(questionVoiceMetrics.map((metric) => metric.paceWpm || 0)),
    fillerScore: average(questionVoiceMetrics.map((metric) => metric.fillerScore || 0)),
    grammarScore: average(questionVoiceMetrics.map((metric) => metric.grammarScore || 0)),
    clarityScore: average(questionVoiceMetrics.map((metric) => metric.clarityScore || 0)),
    transcriptAccuracy: average(questionVoiceMetrics.map((metric) => metric.transcriptAccuracy || 0)),
    overallScore: average(questionVoiceMetrics.map((metric) => metric.overallScore || 0)),
  };

  const scoreParts = [voiceMetrics.overallScore];
  if (typeof webcamMetrics?.eyeContactRate === "number") {
    scoreParts.push(webcamMetrics.eyeContactRate);
  }
  if (typeof webcamMetrics?.stressScore === "number") {
    scoreParts.push(webcamMetrics.stressScore);
  }
  const overallScore = Math.round(
    scoreParts.reduce((sum, value) => sum + value, 0) / scoreParts.length
  );

  return {
    session: sessionId,
    sessionType,
    role,
    jobDescription,
    resumeSnapshot,
    questionsAsked: normalizedQuestions,
    voiceMetrics,
    webcamMetrics,
    recording,
    report,
    interviewMeta,
    overallScore,
    feedback: [
      ...(analysis?.overallFeedback ? [analysis.overallFeedback] : []),
      ...new Set([...(webcamMetrics.prompts || [])]),
    ],
    strengths: analysis?.strengths || [],
    weaknesses: analysis?.improvements || [],
  };
};
