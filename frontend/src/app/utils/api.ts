const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include", // Required to send/receive HTTP-only cookies in cross-origin fetch
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

export async function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("user");
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
    return userStr ? JSON.parse(userStr) : null;
  }
  return null;
}
