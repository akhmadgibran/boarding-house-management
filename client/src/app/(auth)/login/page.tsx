"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/features/auth/services/auth.service";
import { getDefaultRouteByRole } from "@/features/auth/services/auth-routing";
import { setToken } from "@/lib/utils/token";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { ApiError } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.replace(getDefaultRouteByRole(user.role));
    }
  }, [isAuthLoading, router, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await authService.login({ email, password });
      setToken(data.token);
      setUser(data.user);
      router.replace(getDefaultRouteByRole(data.user.role));
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <section className="auth-fade-in auth-delay-2 rounded-3xl border border-gray-200 bg-white p-7 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Log in to account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Use registered email and password.
            </p>
          </div>
          <span className="hidden rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 sm:inline-flex">
            Secure Login
          </span>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <svg
                  aria-hidden
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-5 w-5"
                >
                  <path
                    d="M3.333 6.667 10 11.667l6.667-5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <rect
                    x="2.5"
                    y="4.167"
                    width="15"
                    height="11.667"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                </svg>
              </span>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pr-4 pl-10 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Password
              </label>
            </div>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <svg
                  aria-hidden
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-5 w-5"
                >
                  <rect
                    x="4.167"
                    y="8.333"
                    width="11.667"
                    height="8.333"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M6.667 8.333V6.667a3.333 3.333 0 0 1 6.666 0v1.666"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pr-12 pl-10 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition hover:text-gray-600 focus:outline-none focus-visible:text-gray-700"
              >
                {showPassword ? (
                  <svg
                    aria-hidden
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-5 w-5"
                  >
                    <path
                      d="M3.333 3.333 16.667 16.667"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                    <path
                      d="M8.233 8.233a2.5 2.5 0 0 0 3.534 3.534"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                    <path
                      d="M7.083 4.992A7.633 7.633 0 0 1 10 4.417c4.167 0 7.5 4.583 7.5 5.583 0 .458-.7 1.575-1.867 2.692M4.475 6.317C3.25 7.408 2.5 9.217 2.5 10c0 1 3.333 5.583 7.5 5.583a7.584 7.584 0 0 0 3.05-.642"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    aria-hidden
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-5 w-5"
                  >
                    <path
                      d="M2.5 10c0-1 3.333-5.583 7.5-5.583S17.5 9 17.5 10 14.167 15.583 10 15.583 2.5 11 2.5 10Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="10"
                      cy="10"
                      r="2.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="remember" className="text-sm text-gray-600">
                Remember me on this device
              </label>
            </div>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-gray-700 transition hover:text-gray-900"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Processing..." : "Log in"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            Need a new account?
            <a
              href="mailto:admin@kost.local"
              className="ml-1 font-medium text-gray-900 hover:underline"
            >
              Contact admin
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
