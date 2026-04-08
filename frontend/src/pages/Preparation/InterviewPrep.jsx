import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import { AnimatePresence, motion } from "framer-motion";
import { LuCircleAlert, LuListCollapse } from "react-icons/lu";
import SpinnerLoader from "./Loader/SpinnerLoader.jsx";
import { toast } from "react-hot-toast";
import DashboardLayout from "../Home/Components/DashboardLayout.jsx";
import RoleInfoHeader from "../Interview/Components/RoleInfoHeader.jsx";
import axiosInstance from "../../utils/axiosInstance.js";
import { API_PATHS } from "../../constants/apiPaths.js";
import QuestionCard from "./Cards/QuestionCard.jsx";
import Drawer from "./Components/Drawer.jsx";
import SkeletonLoader from "./Loader/SkeletonLoader.jsx";
import AIResponsePreview from "../Interview/Components/AIResponsePreview.jsx";

const DetailCard = ({ label, title, children, className = "" }) => (
  <div className={`theme-surface rounded-2xl border p-5 shadow-sm ${className}`}>
    <div className="text-xs uppercase tracking-[0.2em] theme-text-muted">{label}</div>
    {title && <h3 className="text-lg font-semibold mt-2" style={{ color: "var(--app-text)" }}>{title}</h3>}
    <div className="mt-3 text-sm leading-6" style={{ color: "var(--app-text-muted)" }}>{children}</div>
  </div>
);

const StatPill = ({ label, value }) => (
  <div className="theme-surface rounded-2xl border px-4 py-3 shadow-sm">
    <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">{label}</div>
    <div className="text-xl font-semibold mt-1" style={{ color: "var(--app-text)" }}>{value}</div>
  </div>
);

const InterviewPrep = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [openLeanMoreDrawer, setOpenLeanMoreDrawer] = useState(false);
  const [explanation, setExplanation] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isUpdateLoader, setIsUpdateLoader] = useState(false);

  const resumeSummary = useMemo(() => {
    if (sessionData?.resumeData?.summary) {
      return sessionData.resumeData.summary;
    }

    if (sessionData?.resumeTextSnapshot) {
      return sessionData.resumeTextSnapshot.slice(0, 320);
    }

    return "";
  }, [sessionData]);

  const resumeKeywords = useMemo(() => {
    const keywords = sessionData?.resumeData?.topKeywords?.length
      ? sessionData.resumeData.topKeywords
      : sessionData?.resumeData?.skills || [];

    return [...new Set(keywords)].slice(0, 10);
  }, [sessionData]);

  const pinnedCount = useMemo(
    () => (sessionData?.questions || []).filter((question) => question?.isPinned).length,
    [sessionData]
  );

  const displayRole = sessionData?.role || sessionData?.resumeData?.inferredRole || (sessionData?.isResumeSession ? "Resume Session" : "");

  // Fetch session data by session id
  const fetchSessionDetailsById = async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.SESSION.GET_ONE(sessionId)
      );

      if (response.data && response.data.session) {
        setSessionData(response.data.session);
      }
    } catch (error) {}
  };

  // Generate Concept Explanation
  const generateConceptExplanation = async (question) => {
    try {
      setErrorMsg("");
      setExplanation(null);

      setIsLoading(true);
      setOpenLeanMoreDrawer(true);

      const response = await axiosInstance.post(
        API_PATHS.AI.GENERATE_EXPLANATION,
        {
          question,
        }
      );

      if (response.data) {
        setExplanation(response.data);
      }
    } catch (error) {
      setExplanation(null);
      setErrorMsg("Failed to generate explanation, Try again later");
    } finally {
      setIsLoading(false);
    }
  };

  // Pin Question
  const toggleQuestionPinStatus = async (questionId) => {
    try {
      const response = await axiosInstance.post(
        API_PATHS.QUESTION.PIN(questionId)
      );

      if (response.data && response.data.question) {
        // toast.success('Question Pinned Successfully')
        fetchSessionDetailsById();
      }
    } catch (error) {}
  };

  // Add more questions to a session
  const uploadMoreQuestions = async () => {
    try {
      setIsUpdateLoader(true);

      // Call AI API to generate questions
      const aiResponse = await axiosInstance.post(
        API_PATHS.AI.GENERATE_QUESTIONS,
        {
          role: sessionData?.role,
          experience: sessionData?.experience,
          topicsToFocus: sessionData?.topicsToFocus,
          numberOfQuestions: 10,
          resumeText: sessionData?.resumeTextSnapshot,
          jobDescription: sessionData?.jobDescription,
          resumeData: sessionData?.resumeData,
        }
      );

      // Should be array like [{question, answer}, ...]
      const generatedQuestions = aiResponse.data;

      const response = await axiosInstance.post(
        API_PATHS.QUESTION.ADD_TO_SESSION,
        {
          sessionId,
          questions: generatedQuestions,
        }
      );

      if (response.data) {
        toast.success("Added More Q&A!!");
        fetchSessionDetailsById();
      }
    } catch (error) {
      if (error.response && error.response.data.message) {
        setErrorMsg(error.response.data.message); // <-- fix: use setErrorMsg
      } else {
        setErrorMsg("Something went wrong. Please try again."); // <-- fix: use setErrorMsg
      }
    } finally {
      setIsUpdateLoader(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetailsById();
    }

    return () => { };
  }, []);

  const startSessionInterview = () => {
    const query = sessionData?.isResumeSession
      ? `?sessionId=${sessionId}&isResumeSession=true`
      : `?sessionId=${sessionId}`;

    navigate(`/interview/session-interview${query}`);
  };

  return (
    <DashboardLayout>
      <RoleInfoHeader
        role={displayRole}
        topicsToFocus={sessionData?.topicsToFocus || (sessionData?.isResumeSession ? "Resume" : "")}
        experience={sessionData?.experience || "-"}
        questions={sessionData?.questions?.length || "-"}
        description={sessionData?.description || ""}
        lastUpdated={
          sessionData?.updatedAt
            ? moment(sessionData.updatedAt).format("Do MMM YYYY")
            : ""
        }
      />

      <div className="container mx-auto pt-4 pb-4 px-4 md:px-0 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatPill label="Questions" value={sessionData?.questions?.length || 0} />
          <StatPill label="Pinned" value={pinnedCount} />
          <StatPill
            label="Experience"
            value={sessionData?.experience || sessionData?.resumeData?.inferredExperienceYears || "-"}
          />
          <StatPill
            label="Session Type"
            value={sessionData?.isResumeSession ? "Resume" : "Role Based"}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4 mb-8">
          <DetailCard
            label="Resume Profile"
            title={displayRole || "Candidate Snapshot"}
          >
            <p>{resumeSummary || "This session was created without a stored resume snapshot."}</p>
            {resumeKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {resumeKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="px-3 py-1 rounded-full text-xs font-medium border theme-surface-soft"
                    style={{ color: "var(--app-text)", borderColor: "var(--app-border)" }}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </DetailCard>

          <div className="grid grid-cols-1 gap-4">
            <DetailCard label="Job Description" title="Target Role Context">
              <p>
                {sessionData?.jobDescription
                  ? sessionData.jobDescription.slice(0, 360)
                  : "No job description was attached. Your questions are based on the role, topics, and resume details."}
              </p>
            </DetailCard>

            <DetailCard label="Next Step" title="Launch Practice">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={startSessionInterview}
                  className="px-5 py-3 rounded-full font-semibold transition-colors cursor-pointer"
                  style={{ background: "var(--app-text)", color: "var(--app-bg)" }}
                >
                  Start Session Interview
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/history")}
                  className="px-5 py-3 rounded-full border font-semibold transition-colors cursor-pointer theme-surface"
                  style={{ color: "var(--app-text)", borderColor: "var(--app-border)" }}
                >
                  View Practice History
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl border px-4 py-3 theme-surface-soft" style={{ borderColor: "var(--app-border)" }}>
                  <div className="text-xs uppercase tracking-[0.18em] theme-text-muted">Topics</div>
                  <div className="text-sm font-medium mt-2" style={{ color: "var(--app-text)" }}>
                    {sessionData?.topicsToFocus || "Resume-led prompts"}
                  </div>
                </div>
                <div className="rounded-xl border px-4 py-3 theme-surface-soft" style={{ borderColor: "var(--app-border)" }}>
                  <div className="text-xs uppercase tracking-[0.18em] theme-text-muted">Last Updated</div>
                  <div className="text-sm font-medium mt-2" style={{ color: "var(--app-text)" }}>
                    {sessionData?.updatedAt ? moment(sessionData.updatedAt).format("DD MMM YYYY") : "-"}
                  </div>
                </div>
              </div>
            </DetailCard>
          </div>
        </div>

        <h2 className="text-lg font-semibold" style={{ color: "var(--app-text)" }}>Interview Q & A</h2>

        <div className="grid grid-cols-12 gap-4 mt-5 mb-10">
          <div
            className={`col-span-12 ${openLeanMoreDrawer ? "md:col-span-7" : "md:col-span-8"
              } `}
          >
            <AnimatePresence>
              {sessionData?.questions?.length ? (
                sessionData.questions.map((data, index) => {
                  return (
                    <motion.div
                      key={data._id || index}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{
                        duration: 0.4,
                        type: "spring",
                        stiffness: 100,
                        delay: index * 0.1,
                        damping: 15,
                      }}
                      layout
                      layoutId={`question-${data._id || index}`}
                    >
                      <>
                        <QuestionCard
                          question={data?.question}
                          answer={data?.answer}
                          onLearnMore={() =>
                            generateConceptExplanation(data.question)
                          }
                          isPinned={data?.isPinned}
                          onTogglePin={() => toggleQuestionPinStatus(data._id)}
                        />

                        {!isLoading &&
                          sessionData?.questions?.length == index + 1 && (
                            <div className="flex items-center justify-center mt-5">
                              <button
                                className="flex items-center gap-3 text-sm font-medium px-5 py-2 mr-2 rounded text-nowrap cursor-pointer theme-surface border"
                                style={{ color: "var(--app-text)", borderColor: "var(--app-border)" }}
                                disabled={isLoading || isUpdateLoader}
                                onClick={uploadMoreQuestions}
                              >
                                {isUpdateLoader ? (
                                  <SpinnerLoader size={15} />
                                ) : (
                                  <LuListCollapse className="text-lg" />
                                )}{" "}
                                Load More
                              </button>
                            </div>
                          )}
                      </>
                    </motion.div>
                  );
                })
              ) : (
                <div
                  className="rounded-2xl border border-dashed px-6 py-10 text-center"
                  style={{ borderColor: "var(--app-border)", color: "var(--app-text-muted)", background: "color-mix(in srgb, var(--app-surface) 78%, transparent)" }}
                >
                  Questions will appear here once the session finishes generating.
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div>
          <Drawer
            isOpen={openLeanMoreDrawer}
            onClose={() => setOpenLeanMoreDrawer(false)}
            title={
              !isLoading && Array.isArray(explanation)
                ? explanation[0]?.title
                : explanation?.title
            }
          >
            {errorMsg && (
              <p className="flex gap-2 text-sm text-amber-600 font-medium">
                <LuCircleAlert className="mt-1" /> {errorMsg}
              </p>
            )}
            {isLoading && <SkeletonLoader />}
            {!isLoading && explanation && (
              <AIResponsePreview
                content={
                  Array.isArray(explanation)
                    ? explanation[0]?.explanation
                    : explanation?.explanation
                }
              />
            )}
          </Drawer>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InterviewPrep;
