const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");

const stripApiSuffix = (value = "") => value.replace(/\/api\/?$/, "");

export const getSocketServerUrl = () => {
  const envSocketUrl = trimTrailingSlash(import.meta.env.VITE_SOCKET_URL || "");
  if (envSocketUrl) {
    return envSocketUrl;
  }

  const envApiUrl = trimTrailingSlash(import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL || "");
  if (envApiUrl) {
    return stripApiSuffix(envApiUrl);
  }

  if (typeof window === "undefined") {
    return "http://127.0.0.1:5000";
  }

  const { protocol, hostname, port } = window.location;

  if (port === "5000") {
    return `${protocol}//${hostname}:5000`;
  }

  if (hostname === "localhost" || hostname === "127.0.0.1" || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return `${protocol}//${hostname}:5000`;
  }

  return `${protocol}//${hostname}`;
};

