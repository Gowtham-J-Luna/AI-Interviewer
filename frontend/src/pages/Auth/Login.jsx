import React, { useContext, useState } from "react";
import { Cancel01Icon } from "hugeicons-react";
import { BsGoogle } from "react-icons/bs";
import { BeatLoader } from "react-spinners";
import { useNavigate } from "react-router-dom";
import Input from "../Home/Components/Input.jsx";
import { validateEmail } from "../Home/Utils/helper.js";
import { UserContext } from "../../context/userContext.jsx";
import {
  getFirebaseAuthErrorMessage,
  loginWithFirebaseEmail,
  loginWithFirebaseGoogle,
} from "../../utils/firebaseAuthHelpers.js";

const Login = ({ setCurrentPage, onClose, isDark = false }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const { updateUser } = useContext(UserContext);
  const navigate = useNavigate();

  const finalizeLogin = (sessionData) => {
    const { token } = sessionData;
    if (token) {
      localStorage.setItem("token", token);
      updateUser(sessionData);
      navigate("/dashboard");
    } else {
      setError("Authentication completed, but no app token was returned.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setError("");

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      setLoginLoading(false);
      return;
    }

    if (!password) {
      setError("Please enter the password");
      setLoginLoading(false);
      return;
    }

    try {
      const sessionData = await loginWithFirebaseEmail({ email, password });
      finalizeLogin(sessionData);
    } catch (err) {
      setError(getFirebaseAuthErrorMessage(err, "Login failed. Please try again."));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    setError("");

    try {
      const sessionData = await loginWithFirebaseGoogle();
      finalizeLogin(sessionData);
    } catch (error) {
      setError(getFirebaseAuthErrorMessage(error, "Google login failed. Please try again."));
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div
      className="w-[90vw] md:w-[33vw] p-7 flex flex-col justify-center rounded-lg shadow relative"
      style={{
        background: "linear-gradient(120deg, #ff6a00, #ee0979, #00c3ff, rgb(0,74,25), rgb(0,98,80), #ff6a00)",
        backgroundSize: "300% 100%",
        animation: "gradientBG 8s ease-in-out infinite",
        boxShadow: "0 4px 32px 0 rgba(0,0,0,0.13)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        className={`${isDark ? "text-gray-300 hover:bg-white/10 hover:text-white" : "text-gray-400 hover:bg-grey-100 hover:text-gray-900"} bg-transparent rounded-lg text-sm w-8 h-8 flex justify-center items-center absolute top-3.5 right-3.5 cursor-pointer transition-all duration-200 z-10`}
        onClick={onClose}
      >
        <Cancel01Icon size={14} />
      </button>

      <style>
        {`
          @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
      <div
        style={{
          background: "rgba(255,255,255,0.90)",
          borderRadius: "inherit",
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <h3 className="text-lg font-semibold text-black">Welcome Back</h3>
        <p className="text-xs text-slate-700 mt-[5px] mb-6">
          Sign in to continue your interview practice history.
        </p>

        <form onSubmit={handleLogin}>
          <Input
            value={email}
            onChange={({ target }) => setEmail(target.value)}
            label="Email Address"
            placeholder="Enter your email address"
            type="text"
          />

          <Input
            value={password}
            onChange={({ target }) => setPassword(target.value)}
            label="Password"
            placeholder="Min 8 Characters"
            type="password"
          />

          {error && <p className="text-red-500 text-xs pb-2.5">{error}</p>}

          <div className="flex justify-end mb-2">
            <button
              type="button"
              className="text-xs font-medium text-blue-500 hover:text-blue-700 hover:underline transition-colors"
              onClick={() => setCurrentPage("forgotPassword")}
            >
              Forgot Password?
            </button>
          </div>

          <button type="submit" className="btn-primary w-full mt-2" disabled={loginLoading}>
            <div className="flex items-center justify-center h-6">
              {loginLoading ? <BeatLoader color="white" size={8} speedMultiplier={0.8} /> : "Log In"}
            </div>
          </button>

          <div className="flex items-center my-2">
            <div className="flex-grow h-px bg-gray-200" />
            <span className="mx-2 text-gray-500 text-sm">or</span>
            <div className="flex-grow h-px bg-gray-200" />
          </div>

          <button
            type="button"
            className="btn-primary w-full mt-2"
            onClick={handleGoogleLogin}
            style={{ marginBottom: "8px" }}
            disabled={loginLoading}
          >
            <BsGoogle className="mr-2" size={18} color="white" />
            Continue with Google
          </button>

          <p className="text-[13px] text-slate-800 mt-3">
            Don't have an account?{" "}
            <button
              type="button"
              className="font-medium text-primary underline cursor-pointer"
              onClick={() => {
                setCurrentPage("signup");
              }}
            >
              SignUp
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
