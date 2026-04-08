import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Login from "./Login.jsx";
import SignUp from "./SignUp.jsx";
import ForgotPassword from "./ForgotPassword.jsx";
import { APP_BRAND } from "../../config/branding.js";

const AuthPage = ({ mode = "login" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = location.hash === "#forgot" ? "forgotPassword" : mode;

  const setCurrentPage = (page) => {
    if (page === "signup") {
      navigate("/signup");
      return;
    }
    if (page === "login") {
      navigate("/login");
      return;
    }
    if (page === "forgotPassword") {
      navigate("/login#forgot");
    }
  };

  return (
    <div className="min-h-screen bg-dots-dark text-white grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-white/10 relative overflow-hidden">
        <div className="theme-orb top-16 left-[-4rem] w-64 h-64" style={{ background: "rgba(139,92,246,0.28)" }} />
        <div className="theme-orb bottom-12 right-[-5rem] w-80 h-80" style={{ background: "rgba(56,189,248,0.18)" }} />
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black tracking-[0.12em] border"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.95), rgba(56,189,248,0.95) 55%, rgba(244,114,182,0.9))",
              borderColor: "rgba(255,255,255,0.16)",
            }}
          >
            AI
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{APP_BRAND.name}</h1>
            <p className="text-white/50 text-sm">{APP_BRAND.tagline}</p>
          </div>
        </div>

        <div className="max-w-xl relative z-10">
          <div className="theme-accent-badge inline-flex rounded-full px-4 py-2 text-xs uppercase tracking-[0.26em] font-semibold mb-6">
            Secure Interview Workspace
          </div>
          <h2 className="text-5xl font-semibold leading-tight theme-gradient-text">
            {APP_BRAND.authHeadline}
          </h2>
          <p className="text-white/60 text-lg mt-6 leading-relaxed">
            Sign in to generate resume-driven questions, track voice and webcam feedback live,
            and keep every interview session saved in one clean workspace.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
            <div className="theme-panel-outline rounded-2xl p-5">
              <div className="text-sm uppercase tracking-[0.2em] text-white/40">Resume</div>
              <p className="text-white mt-3">Upload PDF, DOCX, or text and tailor questions to your background.</p>
            </div>
            <div className="theme-panel-outline rounded-2xl p-5">
              <div className="text-sm uppercase tracking-[0.2em] text-white/40">Live Coaching</div>
              <p className="text-white mt-3">See filler-word, grammar, pacing, and eye-contact feedback during practice.</p>
            </div>
          </div>
        </div>

        <Link to="/" className="text-white/50 hover:text-white transition-colors text-sm">
          Back to home
        </Link>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        {currentPage === "signup" && <SignUp setCurrentPage={setCurrentPage} />}
        {currentPage === "login" && <Login setCurrentPage={setCurrentPage} onClose={() => navigate("/")} />}
        {currentPage === "forgotPassword" && <ForgotPassword setCurrentPage={setCurrentPage} onClose={() => navigate("/")} />}
      </div>
    </div>
  );
};

export default AuthPage;
