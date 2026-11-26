import { AuthResponse, UserProfile } from "../types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const ACCESS_KEY = "kasku_access_token";
const REFRESH_KEY = "kasku_refresh_token";
const USER_KEY = "kasku_user";

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getStoredUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function saveAuthSession(data: AuthResponse): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, data.access_token);
  localStorage.setItem(REFRESH_KEY, data.refresh_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  document.cookie = "kasku_auth=1; path=/; max-age=2592000; SameSite=Lax";
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = "kasku_auth=; path=/; max-age=0; SameSite=Lax";
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.error === "string") return body.error;
    if (body && typeof body.message === "string") return body.message;
  } catch {
    // ignore json parse error
  }
  return `Permintaan gagal (${res.status})`;
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  const data = (await res.json()) as AuthResponse;
  saveAuthSession(data);
  return data;
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  const data = (await res.json()) as AuthResponse;
  saveAuthSession(data);
  return data;
}

export async function logoutUser(): Promise<void> {
  const refreshToken =
    typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null;
  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // ignore network error on logout
    }
  }
  clearAuthSession();
}

async function tryRefreshToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      clearAuthSession();
      return null;
    }
    const data = (await res.json()) as AuthResponse;
    saveAuthSession(data);
    return data.access_token;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getStoredAccessToken();
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const doRequest = (accessToken: string) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });

  let res = await doRequest(token);

  if (res.status === 401) {
    const newToken = await tryRefreshToken();
    if (!newToken) {
      clearAuthSession();
      throw new Error("UNAUTHORIZED");
    }
    res = await doRequest(newToken);
    if (res.status === 401) {
      clearAuthSession();
      throw new Error("UNAUTHORIZED");
    }
  }

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  if (res.status === 204) {
    return {} as T;
  }

  return (await res.json()) as T;
}
