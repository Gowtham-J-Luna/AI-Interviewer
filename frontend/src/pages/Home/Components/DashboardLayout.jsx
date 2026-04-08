import React, { useContext } from "react";
import { UserContext } from "../../../context/userContext.jsx";
import Navbar from "../../Navbar/Navbar.jsx";

const DashboardLayout = ({ children }) => {
  const { user } = useContext(UserContext);
  return (
    <div
      className="min-h-screen bg-dots-dark"
      style={{
        opacity: 1,
        color: "var(--app-text)",
      }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="theme-orb top-16 left-[-5rem] w-72 h-72" style={{ background: "rgba(139, 92, 246, 0.3)" }} />
        <div className="theme-orb top-1/3 right-[-6rem] w-96 h-96" style={{ background: "rgba(56, 189, 248, 0.22)" }} />
        <div className="theme-orb bottom-[-6rem] left-1/3 w-96 h-96" style={{ background: "rgba(244, 114, 182, 0.18)" }} />
      </div>
      <Navbar />
      <main className="pt-28 pb-8 relative z-10">{user && <div>{children}</div>}</main>
    </div>
  );
};

export default DashboardLayout;
