"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { login, register, saveToken } from "@/lib/auth";

type Mode = "login" | "register";

const copy = {
  login: {
    title: "Sign in",
    submit: "Sign in",
    pending: "Signing in…",
    switchText: "Don't have an account?",
    switchLink: "Create one",
    switchHref: "/register",
  },
  register: {
    title: "Create an account",
    submit: "Create account",
    pending: "Creating account…",
    switchText: "Already have an account?",
    switchLink: "Sign in",
    switchHref: "/login",
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const text = copy[mode];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const name = String(form.get("name") ?? "").trim();

    setError(null);
    setSubmitting(true);
    try {
      const { accessToken } =
        mode === "login"
          ? await login(email, password)
          : await register(email, password, name || undefined);
      saveToken(accessToken);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300 dark:focus:ring-zinc-300";

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          {text.title}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "register" && (
            <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              <span>
                Name <span className="text-zinc-500">(optional)</span>
              </span>
              <input name="name" type="text" autoComplete="name" maxLength={100} className={inputClass} />
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Email
            <input name="email" type="email" autoComplete="email" required className={inputClass} />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Password
            <input
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={mode === "register" ? 8 : undefined}
              className={inputClass}
            />
            {mode === "register" && (
              <span className="text-xs text-zinc-500">At least 8 characters</span>
            )}
          </label>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-300"
          >
            {submitting ? text.pending : text.submit}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          {text.switchText}{" "}
          <Link href={text.switchHref} className="font-medium text-black underline dark:text-zinc-50">
            {text.switchLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
