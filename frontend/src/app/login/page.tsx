"use client";

import AuthHero from "../components/AuthHero";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, getCurrentUser } from "../utils/api";
import Logo from "../components/Logo";
import { Lock, Mail, Loader2, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (getCurrentUser()) {
      router.push("/companies");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        router.push("/companies");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#020617] light:bg-slate-100 flex items-center justify-center p-4 md:p-8 select-none font-sans overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Container Card */}
      <div className="w-full max-w-5xl bg-[#0b1528] light:bg-white border border-slate-800 light:border-slate-200/80 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.4)] light:shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col md:flex-row min-h-[620px] z-10">
        
        <AuthHero
          headline={<>Manage smarter,<br />scale faster</>}
          sub={"Double-entry ledger bookkeeping, real-time inventory valuation, and instant financial reports."}
          tags={["F8 Sales", "F9 Purchase", "Alt+L Ledgers", "Ctrl+K Search"]}
        />

        {/* Right Side: Authentication Form */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-[#0b1528] light:bg-white">
          <div className="space-y-8 max-w-sm mx-auto w-full">
            
            {/* Header: Logo & Back Link */}
            <div className="flex items-center justify-between">
              <Logo size="md" />
              <Link
                href="/"
                className="text-xs font-semibold text-slate-400 light:text-slate-500 hover:text-brand-red light:hover:text-brand-red transition-colors flex items-center gap-1"
              >
                ← Home
              </Link>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white light:text-slate-900 tracking-tight">
                Sign In
              </h2>
              <p className="text-xs md:text-sm text-slate-400 light:text-slate-500">
                Welcome back! Please enter your account credentials.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-400 light:text-red-600">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300 light:text-slate-700 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/80 light:bg-slate-50 border border-slate-700/80 light:border-slate-300 rounded-xl text-white light:text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300 light:text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-900/80 light:bg-slate-50 border border-slate-700/80 light:border-slate-300 rounded-xl text-white light:text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 light:hover:text-slate-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 flex items-center justify-center gap-2 rounded-xl font-bold text-white bg-brand-red hover:bg-red-600 active:bg-red-700 disabled:opacity-50 transition-all duration-300 shadow-lg shadow-red-500/25 text-sm mt-2 transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In to Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="pt-2 text-center text-xs text-slate-400 light:text-slate-600">
              Don't have an account?{" "}
              <Link href="/register" className="text-brand-red hover:underline font-bold">
                Create an account
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
