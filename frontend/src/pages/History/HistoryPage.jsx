import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import moment from "moment";
import DashboardLayout from "../Home/Components/DashboardLayout.jsx";
import axiosInstance from "../../utils/axiosInstance.js";
import { API_PATHS } from "../../constants/apiPaths.js";
import { BASE_URL } from "../../constants/apiPaths.js";

const StatBlock = ({ label, value }) => (
  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
    <div className="text-white/50 text-xs uppercase">{label}</div>
    <div className="text-white text-3xl font-semibold mt-2">{value}</div>
  </div>
);

const TrendLegend = () => (
  <div className="flex flex-wrap gap-3 mt-4 text-xs text-white/60">
    <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white">Overall</span>
    <span className="px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">Clarity</span>
    <span className="px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-300">Grammar</span>
    <span className="px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-300">Eye Contact</span>
  </div>
);

const AttemptDetailPanel = ({ attempt }) => {
  const recordingUrl = attempt?.recording?.url
    ? attempt.recording.url.startsWith("http")
      ? attempt.recording.url
      : `${BASE_URL || ""}${attempt.recording.url}`
    : "";
  const questionMetrics = (attempt?.questionsAsked || []).map((entry, index) => ({
    name: `Q${index + 1}`,
    score: entry.voiceMetrics?.overallScore || 0,
    clarity: entry.voiceMetrics?.clarityScore || 0,
    grammar: entry.voiceMetrics?.grammarScore || 0,
  }));

  if (!attempt) {
    return null;
  }

  return (
    <section className="bg-black border border-white/10 rounded-2xl p-6 mt-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold text-white">{attempt.role || "Practice Session"}</h2>
          <p className="text-white/50 text-sm mt-1">
            {moment(attempt.createdAt).format("DD MMM YYYY, hh:mm A")} | {attempt.sessionType}
          </p>
        </div>
        <div className="bg-white text-black px-4 py-2 rounded-full text-sm font-semibold">
          Overall {attempt.overallScore || 0}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-6">
        <StatBlock label="Clarity" value={attempt.voiceMetrics?.clarityScore || 0} />
        <StatBlock label="Grammar" value={attempt.voiceMetrics?.grammarScore || 0} />
        <StatBlock label="Filler Control" value={attempt.voiceMetrics?.fillerScore || 0} />
        <StatBlock label="Eye Contact" value={`${attempt.webcamMetrics?.eyeContactRate || 0}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-white/50 text-xs uppercase">Word Accuracy</div>
          <div className="text-white text-2xl font-semibold mt-2">
            {attempt.voiceMetrics?.transcriptAccuracy || 0}%
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-white/50 text-xs uppercase">Stress Score</div>
          <div className="text-white text-2xl font-semibold mt-2">
            {attempt.webcamMetrics?.stressScore || 0}/100
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-white/50 text-xs uppercase">Saved Recording</div>
          {recordingUrl ? (
            <a
              href={recordingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex mt-2 text-sm text-black bg-white px-3 py-2 rounded-full font-medium"
            >
              Open video
            </a>
          ) : (
            <p className="text-white/60 text-sm mt-2">No saved video file</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 mt-6">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-white/50 text-xs uppercase">Question Scores</div>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={questionMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "#050505",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "12px",
                  }}
                />
                <Bar dataKey="score" fill="#ffffff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-white/50 text-xs uppercase">Strengths</div>
            <div className="text-white mt-4 space-y-2 text-sm">
              {(attempt.strengths || []).length > 0 ? (
                attempt.strengths.map((item, index) => <p key={index}>- {item}</p>)
              ) : (
                <p className="text-white/60">No strengths captured yet.</p>
              )}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-white/50 text-xs uppercase">Weaknesses</div>
            <div className="text-white mt-4 space-y-2 text-sm">
              {(attempt.weaknesses || []).length > 0 ? (
                attempt.weaknesses.map((item, index) => <p key={index}>- {item}</p>)
              ) : (
                <p className="text-white/60">No weaknesses captured yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-white/50 text-xs uppercase">Resume Snapshot</div>
          <p className="text-white/80 text-sm mt-4 leading-6">
            {attempt.resumeSnapshot?.data?.summary || "No resume snapshot stored for this attempt."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(attempt.resumeSnapshot?.data?.topKeywords || attempt.resumeSnapshot?.data?.skills || []).slice(0, 10).map((keyword, index) => (
              <span key={index} className="px-3 py-1 rounded-full text-xs bg-white/10 text-white/80 border border-white/10">
                {keyword}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-white/50 text-xs uppercase">Job Description</div>
          <p className="text-white/80 text-sm mt-4 leading-6">
            {attempt.jobDescription || "No job description was attached to this practice session."}
          </p>
        </div>
      </div>

      <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="text-white/50 text-xs uppercase">Saved Report</div>
        <p className="text-white/80 text-sm mt-4 leading-6">
          {attempt.report?.analysisSnapshot?.overallFeedback ||
            "No detailed report snapshot was saved for this session."}
        </p>
        {attempt.report?.pdfData?.analysis?.keyTakeaways?.length > 0 && (
          <div className="mt-4 space-y-2 text-sm text-white/70">
            {attempt.report.pdfData.analysis.keyTakeaways.slice(0, 4).map((item, index) => (
              <p key={index}>- {item}</p>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="text-white/50 text-xs uppercase">Question Breakdown</div>
        <div className="mt-4 space-y-4">
          {(attempt.questionsAsked || []).map((entry, index) => (
            <div key={`${attempt._id}-${index}`} className="border-b border-white/10 pb-4 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <p className="text-white font-medium">{entry.question}</p>
                <span className="text-xs text-white/50">{entry.voiceMetrics?.overallScore || 0}/100</span>
              </div>
              <p className="text-white/60 text-sm mt-2 whitespace-pre-wrap">
                {entry.transcript || "No transcript saved"}
              </p>
              <p className="text-white/40 text-xs mt-2">
                Clarity {entry.voiceMetrics?.clarityScore || 0} | Grammar {entry.voiceMetrics?.grammarScore || 0} | Fillers {entry.voiceMetrics?.fillerWords || 0}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const HistoryPage = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [trend, setTrend] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      setHistoryError("");

      try {
        const [attemptsResult, statsResult] = await Promise.allSettled([
          axiosInstance.get(API_PATHS.ATTEMPTS.GET_ALL),
          axiosInstance.get(API_PATHS.ATTEMPTS.GET_STATS),
        ]);

        const loadedAttempts =
          attemptsResult.status === "fulfilled" ? attemptsResult.value.data?.attempts || [] : [];
        setAttempts(loadedAttempts);
        const loadedTrend =
          statsResult.status === "fulfilled" ? statsResult.value.data?.trend || [] : [];

        setTrend(
          loadedTrend.map((point) => ({
            ...point,
            dateLabel: moment(point.date).format("DD MMM"),
          }))
        );

        if (!attemptId) {
          setSelectedAttempt(loadedAttempts[0] || null);
        }

        if (attemptsResult.status === "rejected" && statsResult.status === "rejected") {
          setHistoryError("Could not load your saved history right now.");
        } else if (attemptsResult.status === "rejected") {
          setHistoryError("Saved attempts could not be loaded, but score trends may still appear.");
        } else if (statsResult.status === "rejected") {
          setHistoryError("Saved attempts loaded, but trend data is temporarily unavailable.");
        }
      } catch (error) {
        setHistoryError("Could not load your saved history right now.");
      }
    };

    loadHistory();
  }, [attemptId]);

  useEffect(() => {
    const loadAttempt = async () => {
      if (!attemptId) {
        return;
      }

      try {
        const response = await axiosInstance.get(API_PATHS.ATTEMPTS.GET_ONE(attemptId));
        setSelectedAttempt(response.data?.attempt || null);
      } catch (error) {
        setSelectedAttempt(null);
        setHistoryError("Could not load that session detail right now.");
      }
    };

    loadAttempt();
  }, [attemptId]);

  const bestScore = useMemo(
    () => (attempts.length ? Math.max(...attempts.map((attempt) => attempt.overallScore || 0)) : 0),
    [attempts]
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
          <section className="bg-black border border-white/10 rounded-2xl p-6">
            <h1 className="text-2xl font-semibold text-white">Practice History</h1>
            <p className="text-white/50 text-sm mt-1">
              Review score trends, open a session, and inspect question-level coaching details.
            </p>

            {historyError && (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {historyError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <StatBlock label="Attempts" value={attempts.length} />
              <StatBlock label="Best Score" value={bestScore} />
              <StatBlock label="Latest Role" value={attempts[0]?.role || "No attempts yet"} />
            </div>

            <div className="h-80 mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="dateLabel" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "#050505",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                    }}
                  />
                <Line type="monotone" dataKey="overallScore" stroke="#ffffff" strokeWidth={3} />
                <Line type="monotone" dataKey="clarityScore" stroke="#22c55e" strokeWidth={2} />
                <Line type="monotone" dataKey="grammarScore" stroke="#38bdf8" strokeWidth={2} />
                <Line type="monotone" dataKey="eyeContactRate" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <TrendLegend />
        </section>

          <section className="bg-black border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">Recent Sessions</h2>
              {attemptId && (
                <button
                  type="button"
                  onClick={() => navigate("/history")}
                  className="text-sm text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  Back to list
                </button>
              )}
            </div>
            <div className="mt-4 space-y-3 max-h-[640px] overflow-y-auto pr-2">
              {attempts.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-white/60">
                  No saved sessions yet. Finish an interview and use `Finish & Save` to record it here.
                </div>
              )}

              {attempts.map((attempt) => {
                const active = selectedAttempt?._id === attempt._id;

                return (
                  <Link
                    key={attempt._id}
                    to={`/history/${attempt._id}`}
                    className={`block rounded-xl border p-4 transition-colors ${
                      active
                        ? "bg-white text-black border-white"
                        : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{attempt.role || "Practice Session"}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {moment(attempt.createdAt).format("DD MMM YYYY, hh:mm A")}
                        </div>
                      </div>
                      <div className="text-2xl font-semibold">{attempt.overallScore || 0}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <AttemptDetailPanel attempt={selectedAttempt} />
      </div>
    </DashboardLayout>
  );
};

export default HistoryPage;
