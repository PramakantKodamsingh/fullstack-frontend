export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const TOKEN_KEY = "accessToken";

export type User = {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    // NestJS sends validation errors as an array of messages
    const message = Array.isArray(body?.message)
      ? body.message.join(". ")
      : (body?.message ?? "Something went wrong. Please try again.");
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string, name?: string) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, ...(name ? { name } : {}) }),
  });
}

export function fetchMe(token: string) {
  return request<User>("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Token storage. Components read it with useSyncExternalStore(subscribeToken, getToken, () => null)
const listeners = new Set<() => void>();

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage unavailable (e.g. blocked); the user just won't stay signed in
  }
  listeners.forEach((listener) => listener());
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to clear
  }
  listeners.forEach((listener) => listener());
}

export function subscribeToken(listener: () => void) {
  listeners.add(listener);
  // Keep other open tabs in sync
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
