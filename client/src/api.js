const defaultApiBaseUrl = import.meta.env.PROD
  ? "https://ai-resume-1-7yao.onrender.com"
  : "http://localhost:3013";
const apiBaseUrl = (import.meta.env.VITE_API_URL || defaultApiBaseUrl).replace(/\/+$/, "");

export function apiUrl(path) {
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
