"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { API_URL, clearToken, fetchMe, getToken, subscribeToken, type User } from "@/lib/auth";

type HealthResponse = {
  status: string;
  database: string;
};

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = useSyncExternalStore(subscribeToken, getToken, () => null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setError("Could not reach the backend."));
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchMe(token)
      .then(setUser)
      // Expired or invalid token: sign out
      .catch(() => clearToken());
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        FullStack
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Next.js frontend &rarr; NestJS backend &rarr; PostgreSQL
      </p>

      {!token && (
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-300"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Create account
          </Link>
        </div>
      )}
      {token && !user && <p className="text-sm text-zinc-500">Loading your account…</p>}
      {token && user && (
        <div className="flex items-center gap-3">
          <p className="text-zinc-700 dark:text-zinc-300">
            Signed in as <strong>{user.name ?? user.email}</strong>
          </p>
          <button
            type="button"
            onClick={clearToken}
            className="rounded-md border border-zinc-300 px-3 py-1 text-sm text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </div>
      )}

      {error && <p className="text-red-500">{error}</p>}
      {health && (
        <pre className="rounded bg-black/[.06] px-4 py-2 font-mono text-sm dark:bg-white/[.08]">
          {JSON.stringify(health, null, 2)}
        </pre>
      )}
    </div>
  );
}
