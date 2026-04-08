import React, { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { MoonLoader } from "react-spinners";
import { UserContext } from "../context/userContext.jsx";

const ProtectedRoute = () => {
  const { user, loading } = useContext(UserContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-dots-dark flex items-center justify-center">
        <MoonLoader color="#ffffff" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
