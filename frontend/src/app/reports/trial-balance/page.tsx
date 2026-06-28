"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getCurrentUser } from "../../utils/api";
import {
  Building2,
  Calendar,
  Search,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Scale,
  CheckCircle,
  HelpCircle
} from "lucide-react";

interface LedgerRow {
  ledger_id: string;
  ledger_name: string;
  ledger_type: string;
  group_name: string;
  opening_balance: number;
  opening_balance_type: string;
  debit_total: number;
  credit_total: number;
  closing_balance: number;
  closing_balance_type: string;
}

export default function TrialBalanceReportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  // Filter params
  const [startDate, setStartDate] = useState("2026-04-01");
  const [endDate, setEndDate] = useState("2026-06-28");
  const [searchQuery, setSearchQuery] = useState("");

  // Report data
  const [reportRows, setReportRows] = useState<LedgerRow[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Toast notifications state
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);

  const triggerToast = (text: string) => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    console.log("[TrialBalance] Checking session...");
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
      fetchTrialBalance(activeCompany.id, startDate, endDate);
    } catch (err) {
      console.error("[TrialBalance Error] Active company failed:", err);
      router.push("/companies");
    }
  }, [router]);

  const fetchTrialBalance = async (companyId: string, start: string, end: string) => {
    setLoading(true);
    setError("");
    console.log(`[TrialBalance] Querying balances from ${start} to ${end}`);
    try {
      const data = await apiFetch(`/reports/trial-balance?company_id=${companyId}&start_date=${start}&end_date=${end}`);
      setReportRows(data.report.rows || []);
      setTotals(data.report.totals || null);
    } catch (err: any) {
      console.error("[TrialBalance Error] Load failed:", err);
      setError(err.message || "Failed to load Trial Balance balances.");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = () => {
    if (company) {
      fetchTrialBalance(company.id, startDate, endDate);
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

  const filteredRows = reportRows.filter(r => 
    r.ledger_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.group_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isBalanced = totals && Math.abs(totals.closing_debit - totals.closing_credit) < 0.01;

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
              <Scale className="w-6 h-6 text-brand-lime" />
              Trial Balance Sheet
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Validates double-entry postings by auditing ledger debit and credit balances in real-time.
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
            isBalanced 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <>
                  <CheckCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>Trial Balance holds perfect parity: Sum of Debits matches Sum of Credits.</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>Discrepancy detected: Debit and Credit sums do not balance.</span>
                </>
              )}
            </div>
            <div className="font-mono text-right font-black">
              Diff: ${Math.abs(totals.closing_debit - totals.closing_credit).toFixed(2)}
            </div>
          </div>
        )}

        {/* Filters and List */}
        <div className="rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-6 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search ledger names or groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-brand-navy-dark/60 border border-slate-850 rounded-2xl text-slate-200 placeholder-slate-500 outline-none focus:border-brand-lime transition text-xs font-semibold"
            />
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-lime" />
              <p className="text-xs">Computing balances...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-slate-300 text-sm">{error}</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-24 border border-dashed border-slate-800 rounded-3xl text-center">
              <p className="text-slate-400 text-xs">No active ledger balances found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-900/50 rounded-2xl bg-brand-navy-dark/20">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                    <th className="py-3 px-4">Ledger Account</th>
                    <th className="py-3 px-4">Group Classification</th>
                    <th className="py-3 px-4 text-right">Opening Balance ($)</th>
                    <th className="py-3 px-4 text-right">Debit Movement ($)</th>
                    <th className="py-3 px-4 text-right">Credit Movement ($)</th>
                    <th className="py-3 px-4 text-right">Closing Balance ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.ledger_id} className="border-b border-slate-900/40 hover:bg-slate-900/10 text-slate-300">
                      <td className="py-3 px-4 font-bold text-white">{row.ledger_name}</td>
                      <td className="py-3 px-4 uppercase text-[10px] text-slate-500">{row.group_name}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        {row.opening_balance > 0 
                          ? `${row.opening_balance.toFixed(2)} ${row.opening_balance_type.toUpperCase()}`
                          : "0.00"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {row.debit_total > 0 ? row.debit_total.toFixed(2) : "0.00"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {row.credit_total > 0 ? row.credit_total.toFixed(2) : "0.00"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {row.closing_balance > 0 
                          ? `${row.closing_balance.toFixed(2)} ${row.closing_balance_type.toUpperCase()}`
                          : "0.00"}
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  {totals && (
                    <tr className="bg-slate-950/60 font-black border-t-2 border-t-slate-800 text-white">
                      <td className="py-4 px-4 uppercase text-[10px] tracking-wider text-brand-lime">Total Movements</td>
                      <td className="py-4 px-4"></td>
                      <td className="py-4 px-4 text-right font-mono">
                        <div className="flex flex-col text-[10px] leading-tight">
                          <span>Dr: ${totals.opening_debit.toFixed(2)}</span>
                          <span>Cr: ${totals.opening_credit.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-slate-300">
                        ${totals.debit_movements.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-slate-300">
                        ${totals.credit_movements.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-brand-lime">
                        <div className="flex flex-col text-[10px] leading-tight">
                          <span>Dr: ${totals.closing_debit.toFixed(2)}</span>
                          <span>Cr: ${totals.closing_credit.toFixed(2)}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Floating Toast Notification Container */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="p-4 rounded-2xl bg-brand-navy-light/95 border border-slate-800 text-xs font-semibold text-white shadow-2xl backdrop-blur-md flex items-center gap-3 pointer-events-auto"
          >
            <div className="p-1 bg-brand-lime/10 border border-brand-lime/20 text-brand-lime rounded-lg shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
