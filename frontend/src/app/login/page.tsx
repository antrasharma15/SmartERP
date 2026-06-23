"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, getCurrentUser } from "../utils/api";
import { Lock, Mail, Loader2, Eye, EyeOff, User } from "lucide-react";

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
    <div className="relative min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6 select-none font-sans">
      {/* Soft blurred background blobs to match the JPEG visual surroundings */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-sky-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none"></div>

      {/* Central Login Card */}
      <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(18,52,102,0.15)] overflow-hidden flex flex-col md:flex-row min-h-[580px] z-10">
        
        {/* Left Side: Deep Blue panel with abstract circles and cartoon illustration */}
        <div className="md:w-1/2 bg-gradient-to-br from-[#0e2c6c] via-[#0f3d9b] to-[#1253d2] p-8 md:p-12 flex flex-col justify-between items-center text-center relative overflow-hidden text-white">
          {/* Abstract circles */}
          <div className="absolute top-6 left-6 w-16 h-16 rounded-full bg-white/10"></div>
          <div className="absolute top-1/2 -left-4 w-6 h-6 rounded-full bg-white/20"></div>
          <div className="absolute bottom-12 right-12 w-12 h-12 rounded-full bg-white/10"></div>

          {/* Spacer */}
          <div className="hidden md:block"></div>

          {/* Cartoon Character / Bench Illustration SVG */}
          <div className="relative w-full max-w-[280px] my-6 md:my-0 flex justify-center items-center">
            <svg viewBox="0 0 280 200" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Clouds */}
              <ellipse cx="75" cy="50" rx="25" ry="10" fill="white" fillOpacity="0.2" />
              <ellipse cx="205" cy="45" rx="25" ry="10" fill="white" fillOpacity="0.2" />
              <ellipse cx="140" cy="20" rx="15" ry="6" fill="white" fillOpacity="0.1" />

              {/* Lamp Post / Structure */}
              <rect x="55" y="70" width="4" height="85" fill="#4b5563" />
              <ellipse cx="57" cy="65" rx="12" ry="6" fill="#fbbf24" />

              {/* Bench */}
              <rect x="75" y="110" width="55" height="6" fill="#d1d5db" />
              <rect x="85" y="116" width="4" height="40" fill="#9ca3af" />
              <rect x="120" y="116" width="4" height="40" fill="#9ca3af" />

              {/* Platform */}
              <rect x="35" y="155" width="200" height="4" rx="2" fill="#93c5fd" />

              {/* Floating screens / nodes */}
              <rect x="150" y="80" width="30" height="40" rx="4" fill="white" fillOpacity="0.6" />
              <rect x="155" y="90" width="20" height="4" rx="2" fill="#3b82f6" />
              <rect x="155" y="98" width="15" height="3" rx="1.5" fill="#d1d5db" />
              <rect x="155" y="105" width="20" height="3" rx="1.5" fill="#3b82f6" />
              
              <rect x="150" y="55" width="32" height="20" rx="6" fill="#3b82f6" />
              <path d="M160 65 L164 69 L172 61" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              {/* Green plant */}
              <path d="M210 155 L210 135" stroke="#10b981" strokeWidth="3" />
              <circle cx="200" cy="130" r="6" fill="#10b981" />
              <circle cx="220" cy="130" r="6" fill="#10b981" />
              <circle cx="210" cy="120" r="8" fill="#10b981" />

              {/* Little Cartoon Man */}
              {/* Trousers (Orange) */}
              <rect x="108" y="132" width="26" height="15" rx="5" fill="#ea580c" />
              {/* Shoes (Black) */}
              <ellipse cx="114" cy="148" rx="8" ry="4" fill="#111827" />
              <ellipse cx="128" cy="148" rx="8" ry="4" fill="#111827" />
              {/* Shirt (Blue) */}
              <rect x="100" y="100" width="30" height="34" rx="10" fill="#2563eb" />
              <rect x="94" y="105" width="8" height="24" rx="4" fill="#2563eb" />
              {/* Head */}
              <circle cx="115" cy="85" r="15" fill="#fed7aa" />
              {/* Hair */}
              <path d="M100 80 C100 70, 130 70, 130 80 Z" fill="#111827" />
              {/* Face Details */}
              <circle cx="110" cy="83" r="2" fill="#111827" />
              <circle cx="120" cy="83" r="2" fill="#111827" />
              <path d="M112 90 Q115 93 118 90" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          {/* Subtitle matching JPEG */}
          <div className="space-y-2">
            <h3 className="text-2xl font-serif font-semibold tracking-wide">
              Manage Smarter,
            </h3>
            <p className="text-xl font-serif text-sky-200">
              Grow Faster
            </p>
          </div>
        </div>

        {/* Right Side: Form panel */}
        <div className="md:w-1/2 p-8 md:p-14 flex flex-col justify-center bg-white">
          <div className="space-y-8 max-w-sm mx-auto w-full">
            
            {/* Logo */}
            <div className="flex items-center gap-1 text-xl">
              <span className="font-extrabold text-[#2563eb]">My</span>
              <span className="font-extrabold text-slate-800 tracking-wide font-serif">SmartERP</span>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Sign In to your Account
              </h2>
              <p className="text-sm text-slate-400">
                Welcome back! Please enter your details.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50/50 border border-red-100 text-xs text-red-500">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username/Email Input */}
              <div className="space-y-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-[#f3f4f6]/80 border border-transparent rounded-2xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 outline-none transition text-sm"
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3.5 bg-[#f3f4f6]/80 border border-transparent rounded-2xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 outline-none transition text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 flex items-center justify-center gap-2 rounded-2xl font-bold text-white bg-[#3b82f6] hover:bg-[#2563eb] active:scale-[0.99] disabled:bg-blue-400 transition duration-200 shadow-lg shadow-blue-500/10 text-sm mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="pt-4 text-center text-xs text-slate-400">
              Don't have an account?{" "}
              <Link href="/register" className="text-[#3b82f6] hover:underline font-semibold">
                Create one now
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
