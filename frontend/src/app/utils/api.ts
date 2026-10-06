const getBaseUrl = () => {
  // NEXT_PUBLIC_* is inlined at BUILD time, not read at runtime. On Cloud Run,
  // `--set-env-vars` applies at runtime and will not reach this — set it in
  // frontend/.env.production before building instead. See DEPLOY.md.
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:5000/api`;
    }

    // Dev convenience only: another machine on the LAN hitting `npm run dev`.
    const isPrivateLan =
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname);

    if (isPrivateLan) {
      return `${protocol}//${hostname}:5000/api`;
    }

    // A real host with no configured API URL. Guessing `:5000` here produced a
    // silently broken build on Cloud Run, so say so instead.
    console.error(
      "[api] NEXT_PUBLIC_API_URL was not set at build time. " +
        "Set it in frontend/.env.production and rebuild — see DEPLOY.md."
    );
    return "/api";
  }

  return "http://localhost:5000/api";
};

const BASE_URL = getBaseUrl();

export async function apiFetch(path: string, options: RequestInit = {}) {
  let activeCompanyId = "";
  let authToken = "";
  if (typeof window !== "undefined") {
    const activeCompanyStr = localStorage.getItem("activeCompany");
    if (activeCompanyStr) {
      try {
        const activeCompany = JSON.parse(activeCompanyStr);
        if (activeCompany && activeCompany.id) {
          activeCompanyId = activeCompany.id;
        }
      } catch (e) {
        // Ignore parsing error
      }
    }
    authToken = localStorage.getItem("token") || "";
  }

  const headers = {
    "Content-Type": "application/json",
    ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
    ...(activeCompanyId ? { "x-company-id": activeCompanyId } : {}),
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
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        console.warn("[apiFetch] Unauthorized request (401). Cleaning session and redirecting to login.");
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("activeCompany");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export async function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
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
