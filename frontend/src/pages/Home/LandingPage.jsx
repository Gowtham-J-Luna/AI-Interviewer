import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../../context/userContext.jsx";
import UserProfileButton from "./Components/UserProfileButton.jsx";
import { APP_BRAND } from "../../config/branding.js";

const TYPEWRITER_TEXT = APP_BRAND.name;
const TYPING_SPEED = 100;
const SUBTITLE_TEXT = `${APP_BRAND.landingSubtitlePrefix} `;
const SUBTITLE_PILL = APP_BRAND.landingSubtitlePill;
const SUBTITLE_END = APP_BRAND.landingSubtitleSuffix;
const SUBTITLE_FULL = SUBTITLE_TEXT + SUBTITLE_PILL + SUBTITLE_END;
const SUBTITLE_TYPING_SPEED = 28;

function LandingPage() {
  const [displayedText, setDisplayedText] = useState("");
  const [displayedSubtitle, setDisplayedSubtitle] = useState("");
  const [showButton, setShowButton] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    let isMounted = true;

    function typeWriter(index = 0) {
      if (!isMounted) return;
      setDisplayedText(TYPEWRITER_TEXT.slice(0, index + 1));
      if (index < TYPEWRITER_TEXT.length - 1) {
        setTimeout(() => typeWriter(index + 1), TYPING_SPEED);
      } else {
        setTimeout(() => typeSubtitle(), 250);
      }
    }

    function typeSubtitle(subIndex = 0) {
      if (!isMounted) return;
      setDisplayedSubtitle(SUBTITLE_FULL.slice(0, subIndex + 1));
      if (subIndex < SUBTITLE_FULL.length - 1) {
        setTimeout(() => typeSubtitle(subIndex + 1), SUBTITLE_TYPING_SPEED);
      } else {
        setTimeout(() => {
          setShowAll(true);
          setTimeout(() => setShowButton(true), 300);
        }, 250);
      }
    }

    typeWriter();

    return () => {
      isMounted = false;
    };
  }, [isClient]);

  function handleCTA() {
    if (!user) {
      navigate("/login");
    } else {
      navigate("/dashboard");
    }
  }

  const fontMontserrat = "font-['Montserrat',sans-serif]";

  const renderSubtitle = (subtitle) => {
    if (subtitle.length <= SUBTITLE_TEXT.length) {
      return subtitle;
    }

    return (
      <>
        {SUBTITLE_TEXT}
        <span className={`${fontMontserrat} inline-flex items-center justify-center gap-[0.2em] px-[0.8em] py-[0.32em] rounded-full border text-[clamp(0.9rem,3vw,1.05rem)] mx-[0.25em] theme-accent-badge`}>
          {subtitle.length > SUBTITLE_TEXT.length && (
            <img src="/Logo.svg" alt="AI" className="h-[1.1em] w-[1.1em] mr-[0.1em] align-middle inline-block" />
          )}
          {SUBTITLE_PILL.slice(0, Math.max(0, subtitle.length - SUBTITLE_TEXT.length))}
        </span>
        {subtitle.length > SUBTITLE_TEXT.length + SUBTITLE_PILL.length
          ? SUBTITLE_END.slice(0, subtitle.length - SUBTITLE_TEXT.length - SUBTITLE_PILL.length)
          : null}
      </>
    );
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-center items-center bg-dots-dark px-[5vw] transition-[background,color] duration-300 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-90">
        <div className="theme-orb top-[8%] left-[6%] w-72 h-72" style={{ background: "rgba(139,92,246,0.34)" }} />
        <div className="theme-orb bottom-[10%] right-[8%] w-[22rem] h-[22rem]" style={{ background: "rgba(56,189,248,0.22)" }} />
        <div className="theme-orb bottom-[24%] left-[32%] w-64 h-64" style={{ background: "rgba(244,114,182,0.16)" }} />
      </div>

      {!showAll ? (
        <>
          <h1 className={`${fontMontserrat} text-[clamp(2rem,7vw,3.3rem)] font-semibold mb-4 theme-gradient-text leading-[1.05] text-center max-w-[95vw] break-words`}>
            {displayedText}
            {displayedText.length === TYPEWRITER_TEXT.length - 1 && (
              <span className="border-r-2 border-[#333] animate-blink">&nbsp;</span>
            )}
          </h1>
          {displayedText.length === TYPEWRITER_TEXT.length - 1 && (
            <h2 className={`${fontMontserrat} text-[clamp(1.1rem,4vw,2rem)] font-light mb-8 text-white leading-[1.2] text-center flex items-center justify-center gap-[0.5em] flex-wrap max-w-[95vw]`}>
              {renderSubtitle(displayedSubtitle)}
            </h2>
          )}
        </>
      ) : (
        <>
          <div className="relative w-full max-w-6xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,18,43,0.92),rgba(9,12,28,0.86))] shadow-[0_30px_90px_rgba(2,6,23,0.45)] px-6 py-8 md:px-10 md:py-12 backdrop-blur-xl">
            <div className="absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.2),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.12),transparent_26%)] pointer-events-none" />
            <div className="relative grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-8 items-center">
              <div>
                <div className="theme-accent-badge inline-flex px-4 py-2 rounded-full text-xs uppercase tracking-[0.28em] font-semibold mb-5">
                  {APP_BRAND.dashboardEyebrow}
                </div>
                <h1 className={`${fontMontserrat} text-[clamp(2.4rem,7vw,5rem)] font-semibold mb-4 theme-gradient-text leading-[0.98] max-w-[11ch]`}>
                  {APP_BRAND.name}
                </h1>
                <h2 className={`${fontMontserrat} text-[clamp(1.1rem,3vw,1.6rem)] font-light mb-6 text-white leading-[1.2] flex items-center gap-[0.5em] flex-wrap max-w-[95vw]`}>
                  {renderSubtitle(SUBTITLE_FULL)}
                </h2>
                <p className="text-white/65 max-w-2xl text-base sm:text-lg leading-7 mb-8">
                  {APP_BRAND.dashboardCopy}
                </p>
                {showButton && (
                  <div className="flex flex-row gap-[0.75em] items-center flex-wrap">
                    {user ? (
                      <UserProfileButton user={user} onClick={() => navigate("/dashboard")} />
                    ) : (
                      <>
                        <button
                          className="colorful-gradient-btn w-auto max-w-[220px] min-w-[110px] text-[clamp(0.9rem,2.5vw,1.05rem)] m-0 font-bold outline-none text-white px-[2.2em] py-[0.9em] rounded-full cursor-pointer tracking-[0.03em] hover:scale-[1.03] border border-white/10"
                          onClick={handleCTA}
                        >
                          Log In
                        </button>
                        <Link
                          to="/signup"
                          className="w-auto max-w-[220px] min-w-[110px] text-[clamp(0.9rem,2.5vw,1.05rem)] font-bold text-white border border-white/15 px-[2.2em] py-[0.9em] rounded-full hover:bg-white/10 transition-all"
                        >
                          Sign Up Free
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-4">
                <div className="theme-panel-outline rounded-3xl p-5">
                  <div className="text-xs uppercase tracking-[0.28em] text-white/45">Live Signals</div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/5 p-4">
                      <div className="text-2xl font-semibold text-white">Voice</div>
                      <p className="mt-2 text-sm text-white/55">Filler words, pace, grammar, and clarity in one live stream.</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-4">
                      <div className="text-2xl font-semibold text-white">Vision</div>
                      <p className="mt-2 text-sm text-white/55">Eye contact, framing, and simple stress cues while you answer.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(139,92,246,0.18),rgba(56,189,248,0.12),rgba(244,114,182,0.1))] p-5">
                  <div className="text-xs uppercase tracking-[0.28em] text-white/45">Built Around Your Resume</div>
                  <p className="mt-3 text-white/75 leading-7">
                    Upload a resume, add a target job description, and practice a session that feels closer to your actual interview loop.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default LandingPage;
