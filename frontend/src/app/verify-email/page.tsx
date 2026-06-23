"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "../utils/api";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

function VerifyEmailContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing.");
      return;
    }

    const verify = async () => {
      try {
        const res = await apiFetch("/auth/verify", {
          method: "POST",
          body: JSON.stringify({ token })
        });
        setStatus("success");
        setMessage(res.message || "Email verified successfully!");
        
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "Email verification failed.");
      }
    };

    verify();
  }, [token, router]);

  return (
    <div className="p-8 rounded-3xl bg-brand-navy-light/20 border border-slate-900/60 backdrop-blur-xl space-y-6 shadow-2xl text-center max-w-md w-full">
      {status === "loading" && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <Loader2 className="w-12 h-12 text-brand-lime animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white">Verifying Email</h2>
          <p className="text-sm text-slate-400">
            Please wait while we check your verification token...
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <CheckCircle className="w-12 h-12 text-brand-lime" />
          </div>
          <h2 className="text-2xl font-bold text-white">Verification Complete</h2>
          <p className="text-sm text-brand-lime font-medium">
            {message}
          </p>
          <p className="text-xs text-slate-400">
            Redirecting you to the login screen in a few seconds...
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block px-6 py-2.5 rounded-xl font-bold text-brand-navy-dark bg-brand-lime hover:bg-white text-sm transition"
            >
              Sign In Now
            </Link>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <div className="flex justify-center text-red-500">
            <AlertCircle className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold text-white">Verification Failed</h2>
          <p className="text-sm text-red-400 font-medium">
            {message}
          </p>
          <p className="text-xs text-slate-400">
            The link may have expired or is invalid. Please try registering again or contact support.
          </p>
          <div className="pt-2">
            <Link
              href="/register"
              className="inline-block px-6 py-2.5 rounded-xl font-bold text-slate-300 bg-brand-navy-light border border-slate-800 hover:text-white text-sm transition"
            >
              Register Again
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="relative min-h-screen bg-brand-navy-dark flex items-center justify-center px-6 select-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-lime/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <Suspense fallback={
        <div className="p-8 rounded-3xl bg-brand-navy-light/20 border border-slate-900/60 backdrop-blur-xl text-center text-slate-300 max-w-md w-full">
          <Loader2 className="w-12 h-12 text-brand-lime animate-spin mx-auto mb-4" />
          Loading...
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
