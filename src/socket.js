import { io } from "socket.io-client";

export const resolveBackendUrl = () => {
  const envBackend = process.env.REACT_APP_BACKEND?.trim();
  if (envBackend) {
    return envBackend.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;

    if (port === "3000") {
      return `${protocol}//${hostname}:5001`;
    }

    return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
  }

  return "http://localhost:5001";
};

export const getBackendCandidates = () => {
  const candidates = [];
  const envBackend = process.env.REACT_APP_BACKEND?.trim();

  if (envBackend) {
    candidates.push(envBackend);
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname, port, origin } = window.location;
    candidates.push(origin);

    if (port !== "5001") {
      candidates.push(`${protocol}//${hostname}:5001`);
    }

    candidates.push("http://localhost:5001");
    candidates.push("http://127.0.0.1:5001");
  } else {
    candidates.push("http://localhost:5001");
    candidates.push("http://127.0.0.1:5001");
  }

  return [...new Set(candidates.map((candidate) => candidate.replace(/\/+$/, "")))];
};

const baseOptions = {
  transports: ["polling"],
  forceNew: true,
  reconnectionAttempts: Infinity,
  timeout: 10000,
};

export const backend = resolveBackendUrl();

export const initSocketJS = async () => io(`${backend}/js`, baseOptions);
export const initSocketHTML = async () => io(`${backend}/html`, baseOptions);
export const initSocketCSS = async () => io(`${backend}/css`, baseOptions);
