import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { auth } from "../config/firebase.js";
import axiosInstance from "./axiosInstance.js";
import { API_PATHS } from "../constants/apiPaths.js";

export const getFirebaseAuthErrorMessage = (
  error,
  fallback = "Authentication failed. Please try again."
) => {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return "That email is already in use.";
    case "auth/weak-password":
      return "Please choose a stronger password.";
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/user-not-found":
      return "No account found with that email.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled in Firebase Authentication yet.";
    case "auth/configuration-not-found":
      return "Firebase Authentication is not fully configured for this project.";
    case "auth/popup-closed-by-user":
      return "The Google sign-in popup was closed before login completed.";
    default:
      return error?.response?.data?.message || error?.message || fallback;
  }
};

export const syncFirebaseSession = async (firebaseUser, fallbackProfile = {}) => {
  const idToken = await firebaseUser.getIdToken();
  const response = await axiosInstance.post(API_PATHS.AUTH.FIREBASE, {
    idToken,
    profileImageUrl: firebaseUser.photoURL || fallbackProfile.profileImageUrl,
    name: firebaseUser.displayName || fallbackProfile.name,
  });

  return response.data;
};

export const loginWithFirebaseEmail = async ({ email, password }) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return syncFirebaseSession(credential.user);
};

export const signupWithFirebaseEmail = async ({ email, password, name }) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return syncFirebaseSession(credential.user, { name });
};

export const loginWithFirebaseGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  return syncFirebaseSession(credential.user);
};

export const logoutFirebase = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    return null;
  }
};
