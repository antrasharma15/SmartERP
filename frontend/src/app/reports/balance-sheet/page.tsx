"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getCurrentUser } from "../../utils/api";
import {
  Building2,
  Calendar,
  ArrowLeft,
  Loader2,
  AlertCircle,
  BarChart3,
  CheckCircle2
} from "lucide-react";

interface BSRow {
  name: string;
  amount: number;
}

export default function BalanceSheetReportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  // Filter params
  const [startDate, setStartDate] = useState("2026-04-01");
  const [endDate, setEndDate] = useState("2026-06-28");

  // Report data
  const [assetItems, setAssetItems] = useState<BSRow[]>([]);
  const [liabilityItems, setLiabilityItems] = useState<BSRow[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("[BalanceSheet] Checking session...");
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);

    const activeCompanyStr = localStorage.getItem("activeCompany");
    if (!activeCompanyStr) {
      router.push("/companies");
      return;
    }

    try {
      const activeCompany = JSON.parse(activeCompanyStr);
      setCompany(activeCompany);
      fetchBalanceSheet(activeCompany.id, startDate, endDate);
    } catch (err) {
      console.error("[BalanceSheet Error] Active company failed:", err);
      router.push("/companies");
    }
  }, [router]);

  const fetchBalanceSheet = async (companyId: string, start: string, end: string) => {
    setLoading(true);
    setError("");
    console.log(`[BalanceSheet] Fetching balances from ${start} to ${end}`);
    try {
      const data = await apiFetch(`/reports/balance-sheet?company_id=${companyId}&start_date=${start}&end_date=${end}`);
      setAssetItems(data.report.assets || []);
      setLiabilityItems(data.report.liabilities || []);
      setTotals(data.report.totals || null);
    } catch (err: any) {
      console.error("[BalanceSheet Error] Load failed:", err);
      setError(err.message || "Failed to load Balance Sheet.");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = () => {
    if (company) {
      fetchBalanceSheet(company.id, startDate, endDate);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = 
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "SELECT" || 
        document.activeElement?.tagName === "TEXTAREA";

      if (isTyping) return;

      if (e.key === "Escape") {
        e.preventDefault();
        router.push("/reports");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const holdsParity = totals && totals.balance_difference < 0.01;

  return (
    <div className="min-h-screen bg-brand-navy-dark text-slate-100 flex flex-col select-none relative overflow-hidden font-sans">
      {/* Header bar */}
      <header className="border-b border-brand-navy-light bg-brand-navy-dark/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push("/reports")}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-brand-lime hover:border-brand-lime/40 transition duration-200"
              title="Return to Reports Menu (ESC)"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/dashboard")}>
              <span className="text-xl font-extrabold text-white tracking-wide">My smart</span>
              <span className="px-2 py-0.5 text-xs font-extrabold bg-brand-lime text-brand-navy-dark rounded font-mono">ERP</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-800"></div>
            <div className="flex items-center gap-2 text-brand-lime font-bold">
              <Building2 className="w-5 h-5" />
              <span>{company?.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1 rounded text-slate-400">
              Esc to Back
            </span>
          </div>
        </div>
      </header>

      {/* Main content grid */}
      <main className="flex-1 max-w-[1400px] mx-auto px-6 py-8 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-brand-lime" />
              Company Balance Sheet
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Displays structural assets, capital equity accounts, and payables at a specific point in time.
            </p>
          </div>

          {/* Date Picker Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-950/40 border border-slate-900 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent outline-none text-white font-mono"
              />
              <span className="text-slate-600">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent outline-none text-white font-mono"
              />
            </div>
            <button
              onClick={handleDateChange}
              className="px-4 py-2 bg-brand-lime text-brand-navy-dark font-bold hover:bg-white rounded-xl text-xs transition"
            >
              Update View
            </button>
          </div>
        </div>

        {/* Verification Status */}
        {totals && (
          <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
            holdsParity 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            <div className="flex items-center gap-2">
              {holdsParity ? (
                <>
                  <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
                  <span>Balance sheet equation holds perfect parity: Assets match Liabilities & Equity.</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>Equations unbalanced. Assets do not equal liabilities plus reserves.</span>
                </>
              )}
            </div>
            <div className="font-mono text-right font-black">
              Diff: ${totals.balance_difference.toFixed(2)}
            </div>
          </div>
        )}

        {/* Dual Columns view */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-lime" />
            <p className="text-xs">Reconciling statements...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-slate-300 text-sm">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Liabilities & Capital */}
            <div className="rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-red-400 border-b border-slate-900 pb-2">
                  Liabilities, Equity & Capital Accounts
                </h3>
                {liabilityItems.length === 0 ? (
                  <p className="text-slate-500 italic py-6 text-center text-xs">No active liability items.</p>
                ) : (
                  <div className="space-y-2.5">
                    {liabilityItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-900/40 text-xs">
                        <span className="text-slate-300 font-bold">{item.name}</span>
                        <span className="font-mono text-white font-semibold">
                          {item.amount < 0 ? `-$${Math.abs(item.amount).toFixed(2)}` : `$${item.amount.toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center bg-slate-950/40 p-4 border border-slate-900 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-black">Total Liabilities & Equity</span>
                <span className="font-mono font-black text-white">${totals?.liabilities_total.toFixed(2)}</span>
              </div>
            </div>

            {/* Right Column: Assets */}
            <div className="rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-brand-lime border-b border-slate-900 pb-2">
                  Assets & Debit Values
                </h3>
                {assetItems.length === 0 ? (
                  <p className="text-slate-500 italic py-6 text-center text-xs">No active asset records.</p>
                ) : (
                  <div className="space-y-2.5">
                    {assetItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-900/40 text-xs">
                        <span className="text-slate-300 font-bold">{item.name}</span>
                        <span className="font-mono text-white font-semibold">${item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center bg-slate-950/40 p-4 border border-slate-900 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-black">Total Assets</span>
                <span className="font-mono font-black text-white">${totals?.assets_total.toFixed(2)}</span>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
