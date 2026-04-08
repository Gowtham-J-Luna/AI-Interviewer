import { useCallback, useEffect, useRef, useState } from "react";

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const VIDEO_CONSTRAINTS = {
  facingMode: "user",
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

export const useMediaStream = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [audioOnly, setAudioOnly] = useState(false);
  const [showAudioOnlyNotice, setShowAudioOnlyNotice] = useState(false);
  const [hasAttemptedMediaAccess, setHasAttemptedMediaAccess] = useState(false);
  const [deviceAvailability, setDeviceAvailability] = useState({
    hasVideoInput: true,
    hasAudioInput: true,
  });

  const hasMediaDevicesApi = () =>
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.enumerateDevices === "function" &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  const getMediaSupportError = () => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      return "Camera and microphone access requires a secure origin. Use localhost or HTTPS.";
    }

    return "Camera and microphone APIs are not available in this browser.";
  };

  const stopStream = useCallback((stream) => {
    if (!stream) {
      return;
    }

    stream.getTracks().forEach((track) => {
      if (track.readyState !== "ended") {
        track.stop();
      }
    });
  }, []);

  const attachStream = useCallback(async (stream) => {
    streamRef.current = stream;

    if (!videoRef.current) {
      return;
    }

    videoRef.current.srcObject = stream;

    try {
      await videoRef.current.play();
    } catch (error) {}
  }, []);

  const clearAttachedStream = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause?.();
      videoRef.current.srcObject = null;
    }
  }, [stopStream]);

  const checkDeviceAvailability = useCallback(async () => {
    if (!hasMediaDevicesApi()) {
      return { hasVideoInput: false, hasAudioInput: false };
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const availability = {
        hasVideoInput: devices.some((device) => device.kind === "videoinput"),
        hasAudioInput: devices.some((device) => device.kind === "audioinput"),
      };

      setDeviceAvailability(availability);
      return availability;
    } catch (error) {
      return { hasVideoInput: true, hasAudioInput: true };
    }
  }, []);

  const mapMediaError = (error, wantsAudio, wantsVideo) => {
    if (!error) {
      return "Unable to start the selected device.";
    }

    switch (error.name) {
      case "NotAllowedError":
      case "SecurityError":
        return "Camera or microphone access was denied. Allow access in your browser and try again.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        if (wantsAudio && wantsVideo) {
          return "No camera or microphone was found. Please connect a device and try again.";
        }
        return wantsVideo
          ? "No camera was found. Please connect a camera and try again."
          : "No microphone was found. Please connect a microphone and try again.";
      case "NotReadableError":
      case "TrackStartError":
        return "Camera or microphone is busy in another app. Close other apps using it and try again.";
      case "OverconstrainedError":
      case "ConstraintNotSatisfiedError":
        return "The selected camera settings are not supported on this device. Try again.";
      default:
        return error.message || "Unable to access the camera or microphone.";
    }
  };

  const syncMediaState = async ({ wantsAudio, wantsVideo }) => {
    setHasAttemptedMediaAccess(true);
    setErrorMessage("");

    if (!hasMediaDevicesApi()) {
      setPermissionGranted(false);
      setMicOn(false);
      setCameraOn(false);
      setErrorMessage(getMediaSupportError());
      return false;
    }

    if (!wantsAudio && !wantsVideo) {
      clearAttachedStream();
      setMicOn(false);
      setCameraOn(false);
      setPermissionGranted(false);
      setAudioOnly(false);
      setShowAudioOnlyNotice(false);
      return true;
    }

    const currentStream = streamRef.current;
    const liveAudioTracks = currentStream
      ? currentStream.getAudioTracks().filter((track) => track.readyState === "live")
      : [];
    const liveVideoTracks = currentStream
      ? currentStream.getVideoTracks().filter((track) => track.readyState === "live")
      : [];

    const canReuseExistingTracks =
      (!wantsAudio || liveAudioTracks.length > 0) && (!wantsVideo || liveVideoTracks.length > 0);

    if (canReuseExistingTracks && currentStream) {
      const nextTracks = [
        ...(wantsAudio ? liveAudioTracks : []),
        ...(wantsVideo ? liveVideoTracks : []),
      ];

      if (!wantsAudio) {
        liveAudioTracks.forEach((track) => track.stop());
      }
      if (!wantsVideo) {
        liveVideoTracks.forEach((track) => track.stop());
      }

      const nextStream = new MediaStream(nextTracks);
      await attachStream(nextStream);

      setMicOn(wantsAudio && nextTracks.some((track) => track.kind === "audio"));
      setCameraOn(wantsVideo && nextTracks.some((track) => track.kind === "video"));
      setPermissionGranted(nextTracks.length > 0);
      setAudioOnly(wantsAudio && !wantsVideo);
      setShowAudioOnlyNotice(false);
      setErrorMessage("");
      return true;
    }

    const availability = await checkDeviceAvailability();

    if (wantsAudio && !availability.hasAudioInput) {
      setPermissionGranted(false);
      setMicOn(false);
      setErrorMessage("No microphone was found. Please connect a microphone and try again.");
      return false;
    }

    if (wantsVideo && !availability.hasVideoInput) {
      setPermissionGranted(false);
      setCameraOn(false);
      setAudioOnly(wantsAudio);
      setShowAudioOnlyNotice(wantsAudio);
      setErrorMessage("No camera was found. Please connect a camera and try again.");
      return false;
    }

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: wantsAudio ? AUDIO_CONSTRAINTS : false,
        video: wantsVideo ? VIDEO_CONSTRAINTS : false,
      });

      clearAttachedStream();
      await attachStream(nextStream);

      const nextMicOn = nextStream.getAudioTracks().length > 0;
      const nextCameraOn = nextStream.getVideoTracks().length > 0;

      setMicOn(nextMicOn);
      setCameraOn(nextCameraOn);
      setPermissionGranted(nextMicOn || nextCameraOn);
      setAudioOnly(nextMicOn && !nextCameraOn);
      setShowAudioOnlyNotice(nextMicOn && !nextCameraOn && !availability.hasVideoInput);
      setErrorMessage("");
      return true;
    } catch (error) {
      setPermissionGranted(false);
      setMicOn(false);
      setCameraOn(false);
      setAudioOnly(false);
      setShowAudioOnlyNotice(false);
      setErrorMessage(mapMediaError(error, wantsAudio, wantsVideo));
      clearAttachedStream();
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeDevices = async () => {
      if (!hasMediaDevicesApi()) {
        setDeviceAvailability({ hasAudioInput: false, hasVideoInput: false });
        setErrorMessage(getMediaSupportError());
        return;
      }

      const availability = await checkDeviceAvailability();
      if (!mounted) {
        return;
      }

      if (!availability.hasAudioInput && !availability.hasVideoInput) {
        setErrorMessage("No camera or microphone found. Please connect a device and refresh.");
      } else if (!availability.hasVideoInput && availability.hasAudioInput) {
        setAudioOnly(true);
        setErrorMessage("Camera not detected. You can still practice with microphone-only feedback.");
      }
    };

    initializeDevices();

    return () => {
      mounted = false;
      clearAttachedStream();
    };
  }, [checkDeviceAvailability, clearAttachedStream]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      clearAttachedStream();
    };

    const handlePageHide = () => {
      clearAttachedStream();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [clearAttachedStream]);

  const stopAllMediaTracks = () => {
    clearAttachedStream();
    setMicOn(false);
    setCameraOn(false);
    setPermissionGranted(false);
    setShowAudioOnlyNotice(false);
  };

  const handleMicToggle = async () => syncMediaState({ wantsAudio: !micOn, wantsVideo: cameraOn });

  const handleCameraToggle = async () => syncMediaState({ wantsAudio: micOn, wantsVideo: !cameraOn });

  const requestMedia = async ({ wantsAudio = true, wantsVideo = true } = {}) =>
    syncMediaState({ wantsAudio, wantsVideo });

  const retryPermissions = () => {
    setErrorMessage("");
    setHasAttemptedMediaAccess(false);
    setShowAudioOnlyNotice(false);
  };

  const dismissAudioOnlyNotice = () => {
    setShowAudioOnlyNotice(false);
  };

  return {
    videoRef,
    micOn,
    cameraOn,
    permissionGranted,
    errorMessage,
    audioOnly,
    showAudioOnlyNotice,
    hasAttemptedMediaAccess,
    deviceAvailability,
    requestMedia,
    handleMicToggle,
    handleCameraToggle,
    stopAllMediaTracks,
    retryPermissions,
    dismissAudioOnlyNotice,
  };
};
