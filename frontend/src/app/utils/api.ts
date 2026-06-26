const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:5000/api`;
    }
  }
  return "http://localhost:5000/api";
};

const BASE_URL = getBaseUrl();

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: "include", // Required to send/receive HTTP-only cookies in cross-origin fetch
    });
  } catch (err: any) {
    throw new Error(`Network connection failed: Cannot reach backend server at ${BASE_URL}. Please ensure the backend is running. (Error: ${err.message})`);
  }

  const contentType = response.headers.get("content-type");
  let data: any = {};
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch (e) {
      // Ignore parsing error, default to empty object
    }
  } else {
    try {
      const text = await response.text();
      data = { message: text || `HTTP Error ${response.status}: ${response.statusText}` };
    } catch (e) {
      data = { message: `HTTP Error ${response.status}: ${response.statusText}` };
    }
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export async function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("user");
    localStorage.removeItem("activeCompany");
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (err) {
      // Ignore cleanup error
    }
  }
}

export function getCurrentUser() {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      console.error("Failed to parse user from localStorage:", e);
      localStorage.removeItem("user");
      return null;
    }
  }
  return null;
}
