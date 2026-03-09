import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
});

let _interceptorId: number | null = null;

/**
 * Wire Auth0 access token injection into every API request.
 * Call this once after the user authenticates.
 */
export function setAuthTokenInterceptor(getAccessToken: () => Promise<string>) {
  if (_interceptorId !== null) {
    apiClient.interceptors.request.eject(_interceptorId);
  }
  _interceptorId = apiClient.interceptors.request.use(async (config) => {
    const token = await getAccessToken();
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
}

export default apiClient;
