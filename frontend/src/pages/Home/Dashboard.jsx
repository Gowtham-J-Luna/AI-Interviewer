import React, { useEffect, useState, useContext } from "react";
import { MoonLoader } from 'react-spinners';
import { LuPlus } from "react-icons/lu";
import { BsRecordCircle } from "react-icons/bs";
import { IoDocumentTextOutline } from "react-icons/io5";
import { CARD_BG } from "./Utils/data.js";
import toast from "react-hot-toast";
import DashboardLayout from "./Components/DashboardLayout.jsx";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance.js";
import { API_PATHS } from "../../constants/apiPaths.js";
import SummaryCard from "./Cards/SummaryCard.jsx";
import moment from "moment";
import Modal from "../Preparation/Components/Modal.jsx";
import RecordTypeModal from "./Components/RecordTypeModal.jsx";
import { UserContext } from "../../context/userContext.jsx";
import CreateSessionForm from "../Preparation/CreateSessionForm.jsx";
import DeleteAlertContent from "../Preparation/Components/DeleteAlertContent.jsx";
import ResumeLinkModal from "../Resume/Modal/ResumeLinkModal.jsx";
import CoachMateDrawer from "./Components/CoachMateDrawer.jsx";
import { AiChat02Icon, File02Icon, Add01Icon, Analytics01Icon } from "hugeicons-react";
import { APP_BRAND } from "../../config/branding.js";

const LoadingSpinner = () => (
  <MoonLoader color="#ffffff" />
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openResumeModal, setOpenResumeModal] = useState(false);
  const [openCoachDrawer, setOpenCoachDrawer] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [openDeleteAlert, setOpenDeleteAlert] = useState({
    open: false,
    data: null,
  });
  const [openRecordTypeModal, setOpenRecordTypeModal] = useState(false);

  const handleResumeClick = () => {
    // Always open the modal first to show edit options
    setOpenResumeModal(true);
  };

  const fetchAllSessions = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.SESSION.GET_ALL);
      setSessions(response.data);
    } catch (error) {
    }
  };

  const deleteSession = async (sessionData) => {
    try {
      await axiosInstance.delete(API_PATHS.SESSION.DELETE(sessionData?._id));

      toast.success("Session Deleted Successfully");
      setOpenDeleteAlert({
        open: false,
        data: null,
      });
      fetchAllSessions();
    } catch (error) {
    }
  };

  useEffect(() => {
    fetchAllSessions();
  }, []);

  return (
    <DashboardLayout>
      <div className="container mx-auto pt-4 pb-4 overflow-hidden relative">
        <div className="mx-1 md:mx-10 md:ml-10 mb-8 rounded-[32px] theme-hero-card px-6 py-7 md:px-8 md:py-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-40" style={{ background: "rgba(56,189,248,0.22)" }} />
          <div className="absolute bottom-[-4rem] left-10 w-52 h-52 rounded-full blur-3xl opacity-30" style={{ background: "rgba(244,114,182,0.18)" }} />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-center">
            <div className="max-w-3xl">
              <div className="theme-accent-badge inline-flex items-center px-4 py-2 rounded-full text-xs uppercase tracking-[0.26em] font-semibold">
                {APP_BRAND.dashboardEyebrow}
              </div>
              <h1 className="mt-4 text-3xl md:text-4xl font-semibold leading-tight">
                <span className="theme-gradient-text">{APP_BRAND.dashboardHeadline}</span>
              </h1>
              <p className="mt-3 text-base md:text-lg leading-7" style={{ color: "var(--app-text-muted)" }}>
                {APP_BRAND.dashboardCopy}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="theme-panel-outline rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">Sessions</div>
                <div className="mt-3 text-3xl font-semibold text-white">{sessions?.length || 0}</div>
                <p className="mt-2 text-sm text-white/55">Saved practice setups ready to reuse.</p>
              </div>
              <div className="theme-panel-outline rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">Resume</div>
                <div className="mt-3 text-3xl font-semibold text-white">{user?.resumeLink ? "Linked" : "Missing"}</div>
                <p className="mt-2 text-sm text-white/55">Attach your resume to personalize question sets.</p>
              </div>
              <div className="theme-panel-outline rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">History</div>
                <div className="mt-3 text-3xl font-semibold text-white">Tracked</div>
                <p className="mt-2 text-sm text-white/55">Keep transcripts, reports, and score trends in one place.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 pt-1 pb-3 px-1 md:px-10 md:ml-10">
          {sessions?.map((data, index) => (
            <SummaryCard
              key={data?._id}
              colors={CARD_BG[index % CARD_BG.length]}
              role={data?.role || ""}
              inferredRole={data?.resumeData?.inferredRole || ""}
              topicsToFocus={data?.topicsToFocus || data?.resumeData?.skills || ""}
              experience={data?.experience || "-"}
              questions={data?.questions?.length || "-"}
              description={data?.description || ""}
              lastUpdated={
                data?.updatedAt
                  ? moment(data.updatedAt).format("Do MMM YYYY")
                  : ""
              }
              onSelect={() => navigate(`/interview-prep/${data?._id}`)}
              onDelete={() => setOpenDeleteAlert({ open: true, data })}
              isResumeSession={data?.isResumeSession}
            />
          ))}
        </div>

        <div className="fixed bottom-4 sm:bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-4 z-20">
          <div className="theme-panel-outline backdrop-blur-md p-2 rounded-full flex gap-2 sm:gap-3">
            <button
              className="theme-action-pill h-10 sm:h-12 flex items-center justify-center gap-2 rounded-full transition-colors cursor-pointer px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold"
              onClick={() => setOpenCreateModal(true)}
              title="Session"
            >
              <Add01Icon className="text-lg sm:text-xl" />
              <span className="hidden sm:inline">Session</span>
            </button>
            <button
              className="theme-action-pill h-10 sm:h-12 flex items-center justify-center gap-2 rounded-full transition-colors cursor-pointer px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold"
              onClick={() => setOpenRecordTypeModal(true)}
              title="Record"
            >
              <BsRecordCircle className="text-lg sm:text-xl" />
              <span className="hidden sm:inline">Record</span>
            </button>
            <RecordTypeModal
              isOpen={openRecordTypeModal}
              onClose={() => setOpenRecordTypeModal(false)}
              onSelect={(type) => {
                setOpenRecordTypeModal(false);
                if (type === "hr") {
                  navigate("/interview/hr/record");
                } else if (type === "session") {
                  navigate("/interview/session-interview");
                } else if (type === "live") {
                  navigate("/interview/live");
                } else if (type === "coding") {
                  navigate("/interview/coding");
                }
              }}
            />
            <button
              className="theme-action-pill h-10 sm:h-12 flex items-center justify-center gap-2 rounded-full transition-colors cursor-pointer px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold"
              onClick={handleResumeClick}
              title={user?.resumeLink ? "Manage Resume" : "Add Resume Link"}
            >
              <File02Icon className="text-lg sm:text-xl" stroke="1" />
              <span className="hidden sm:inline">{user?.resumeLink ? "Resume" : "Add Resume"}</span>
            </button>
            <button
              className="theme-action-pill h-10 sm:h-12 flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer px-4 sm:px-5 py-2"
              onClick={() => setOpenCoachDrawer(true)}
              title="AI Magic"
            >
              <AiChat02Icon />
            </button>
            <button
              className="theme-action-pill h-10 sm:h-12 flex items-center justify-center gap-2 rounded-full transition-colors cursor-pointer px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold"
              onClick={() => navigate("/history")}
              title="History"
            >
              <Analytics01Icon />
              <span className="hidden sm:inline">History</span>
            </button>
          </div>
        </div>
      </div>

      <CoachMateDrawer
        isOpen={openCoachDrawer}
        onClose={() => setOpenCoachDrawer(false)}
      />

      <Modal
        isOpen={openCreateModal}
        onClose={() => {
          setOpenCreateModal(false);
        }}
        hideHeader
      >
        <div>
          <CreateSessionForm />
        </div>
      </Modal>

      <ResumeLinkModal
        isOpen={openResumeModal}
        onClose={() => setOpenResumeModal(false)}
        onSave={() => { }}
      />

      <Modal
        isOpen={openDeleteAlert?.open}
        onClose={() => {
          setOpenDeleteAlert({ open: false, data: null });
        }}
        title="Delete Alert"
      >
        <div className="w-[30vw]">
          <DeleteAlertContent
            content="Are you sure you want to delete this session detail?"
            onDelete={() => deleteSession(openDeleteAlert.data)}
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default Dashboard;
