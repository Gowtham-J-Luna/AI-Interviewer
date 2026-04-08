import React from "react";

const PermissionModal = ({
  permissionGranted,
  errorMessage,
  audioOnly,
  showAudioOnlyNotice,
  hasAttemptedMediaAccess,
  retryPermissions,
  dismissAudioOnlyNotice,
}) => {
  if ((permissionGranted && !showAudioOnlyNotice) || (!hasAttemptedMediaAccess && !showAudioOnlyNotice)) {
    return null;
  }

  const handleRetry = () => {
    if (retryPermissions) {
      retryPermissions();
      return;
    }

    window.location.reload();
  };

  if (audioOnly && showAudioOnlyNotice) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-black border border-white/20 p-8 rounded-2xl max-w-lg mx-4 text-center">
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-2 text-white">Audio-Only Mode</h2>
            <p className="text-orange-400 text-sm mb-4 px-4 py-2 bg-orange-900/20 rounded-lg">
              A microphone is available, but no usable camera was detected.
            </p>
          </div>

          <div className="text-left mb-6">
            <p className="text-gray-300 mb-3">What still works:</p>
            <ul className="text-sm text-gray-300 space-y-2">
              <li className="flex items-start">
                <span className="text-green-400 mr-3 mt-0.5 flex-shrink-0">OK</span>
                Your spoken answers can still be recorded and transcribed.
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-3 mt-0.5 flex-shrink-0">OK</span>
                Filler-word, pacing, and grammar feedback will keep working.
              </li>
              <li className="flex items-start">
                <span className="text-orange-400 mr-3 mt-0.5 flex-shrink-0">!</span>
                Eye-contact and face-framing coaching will be unavailable until a camera is connected.
              </li>
            </ul>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={dismissAudioOnlyNotice}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Continue Audio-Only
            </button>
            <button
              onClick={handleRetry}
              className="bg-white text-black px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!permissionGranted) {
    const isSecureOriginIssue = errorMessage.includes("secure origin");
    const isPermissionIssue = /denied|NotAllowed|allow access/i.test(errorMessage);
    const isMissingDevice = /No camera|No microphone|No camera or microphone|No .* found/i.test(errorMessage);
    const title = isSecureOriginIssue
      ? "Use Localhost Or HTTPS"
      : isMissingDevice
      ? "Camera Or Microphone Not Found"
      : isPermissionIssue
      ? "Permission Required"
      : "Camera & Microphone Access";

    const instructions = isSecureOriginIssue
      ? [
          "Open the app on http://localhost:5174 instead of a LAN IP address.",
          "If you need mobile or LAN testing, use HTTPS.",
          "After reopening on localhost or HTTPS, click the mic or camera button again.",
        ]
      : isMissingDevice
      ? [
          "Make sure your camera and microphone are connected and enabled by the OS.",
          "Close other apps that may already be using them.",
          "Try clicking the mic or camera button again after reconnecting the device.",
        ]
      : isPermissionIssue
      ? [
          "Click the camera or microphone icon in the browser address bar.",
          "Allow access for this site.",
          "Then click the mic or camera button again.",
        ]
      : [
          "This interview screen needs camera and microphone access for live practice.",
          "Your browser will only ask after you click the mic or camera button.",
          "If nothing happens, try the button again after checking browser permissions.",
        ];

    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-black border border-white/20 p-8 rounded-2xl max-w-lg mx-4 text-center">
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-2 text-white">{title}</h2>
            {errorMessage ? (
              <p className="text-red-400 text-sm mb-4 px-4 py-2 bg-red-900/20 rounded-lg">{errorMessage}</p>
            ) : null}
          </div>

          <div className="text-left mb-6">
            <p className="text-gray-300 mb-3">To fix this:</p>
            <ul className="text-sm text-gray-300 space-y-2">
              {instructions.map((instruction, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-white mr-3 mt-0.5 flex-shrink-0">{index + 1}.</span>
                  {instruction}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="bg-white text-black px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PermissionModal;
