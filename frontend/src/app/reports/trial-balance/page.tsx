"use client";

import Loader from "../../components/Loader";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getCurrentUser } from "../../utils/api";
import AppLayout from "../../components/AppLayout";
import Logo from "../../components/Logo";
import {
  Building2,
  Calendar,
  Search,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Scale,
  CheckCircle,
  HelpCircle,
  Download
} from "lucide-react";
import { exportToCsv } from "../../utils/exportCsv";

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

  const handleExportCsv = () => {
    const headers = [
      "Ledger Account",
      "Group Classification",
      `Opening Balance (${company?.currency || "₹"})`,
      "Opening Type",
      `Debit Movements (${company?.currency || "₹"})`,
      `Credit Movements (${company?.currency || "₹"})`,
      `Closing Balance (${company?.currency || "₹"})`,
      "Closing Type"
    ];
    const rows = filteredRows.map(r => [
      r.ledger_name,
      r.group_name,
      Number(r.opening_balance).toFixed(2),
      r.opening_balance_type.toUpperCase(),
      Number(r.debit_total).toFixed(2),
      Number(r.credit_total).toFixed(2),
      Number(r.closing_balance).toFixed(2),
      r.closing_balance_type.toUpperCase()
    ]);
    if (totals) {
      rows.push([
        "AUDIT TOTAL",
        "",
        `Dr: ${totals.opening_debit.toFixed(2)} | Cr: ${totals.opening_credit.toFixed(2)}`,
        "",
        totals.debit_movements.toFixed(2),
        totals.credit_movements.toFixed(2),
        `Dr: ${totals.closing_debit.toFixed(2)} | Cr: ${totals.closing_credit.toFixed(2)}`,
        ""
      ]);
    }
    exportToCsv("Trial_Balance_Report", headers, rows);
    triggerToast("Trial Balance CSV exported successfully");
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
    <AppLayout
      pageTitle="Trial Balance Sheet"
      pageSubtitle="Validates double-entry postings by auditing ledger debit and credit balances in real-time."
    >
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 light:border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-white light:text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-red-500" />
              Trial Balance Audit
            </h2>
          </div>

          {/* Date Picker Controls & CSV Export */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 px-3.5 py-2 rounded-xl text-sm font-semibold">
              <Calendar className="w-4 h-4 text-slate-400 light:text-slate-600" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent outline-none text-white light:text-slate-900 font-mono text-sm"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent outline-none text-white light:text-slate-900 font-mono text-sm"
              />
            </div>
            <button
              onClick={handleDateChange}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-sm transition"
            >
              Update View
            </button>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 light:bg-slate-100 hover:bg-slate-700 text-slate-200 light:text-slate-800 border border-slate-700 light:border-slate-300 font-bold rounded-xl text-sm shadow-sm transition"
              title="Export Trial Balance Report to CSV"
            >
              <Download className="w-4 h-4 text-red-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Verification Status */}
        {totals && (
          <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between ${
            isBalanced 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 light:text-emerald-700"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            <div className="flex items-center gap-2.5">
              <Scale className="w-5 h-5 shrink-0" />
              <span>{isBalanced ? "Trial Balance is strictly in equilibrium (Debits Equal Credits)." : "Warning: Double entry imbalance detected in ledger postings!"}</span>
            </div>
            <span className="font-mono font-black text-xs uppercase px-2.5 py-1 rounded bg-black/20 light:bg-slate-200/60">{isBalanced ? "EQUILIBRIUM VERIFIED" : "DIFFERENCE DETECTED"}</span>
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search accounts or groups in trial balance..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-900/60 light:bg-white border border-slate-800 light:border-slate-300 rounded-2xl text-white light:text-slate-900 placeholder-slate-500 outline-none focus:border-red-500 transition text-sm font-semibold"
          />
        </div>

        {/* Table Content */}
        {loading ? (
          <Loader kind="scale" label="Auditing trial ledger entries" />
        ) : error ? (
          <div className="py-16 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-slate-300 light:text-slate-700 text-sm">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-800 light:border-slate-200 rounded-2xl bg-slate-900/30 light:bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 light:border-slate-200 bg-slate-950 light:bg-slate-100 text-slate-400 light:text-slate-600 uppercase font-black tracking-wider text-xs">
                  <th className="py-3.5 px-4">Ledger Account</th>
                  <th className="py-3.5 px-4">Group Classification</th>
                  <th className="py-3.5 px-4 text-right">Opening Balance</th>
                  <th className="py-3.5 px-4 text-right">Debit Movements</th>
                  <th className="py-3.5 px-4 text-right">Credit Movements</th>
                  <th className="py-3.5 px-4 text-right">Closing Balance</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredRows.map((r, idx) => (
                  <tr key={idx} className="border-b border-slate-800/50 light:border-slate-100 text-slate-300 light:text-slate-700 hover:bg-slate-800/40 light:hover:bg-slate-100/60 transition">
                    <td className="py-3.5 px-4 font-bold text-white light:text-slate-900">{r.ledger_name}</td>
                    <td className="py-3.5 px-4 text-slate-400 light:text-slate-600 font-medium">{r.group_name}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium">
                      {Number(r.opening_balance).toFixed(2)} <span className="text-xs text-slate-500 font-bold uppercase">{r.opening_balance_type}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300 light:text-slate-700 font-medium">
                      {r.debit_total > 0 ? `${company?.currency || "₹"}${Number(r.debit_total).toFixed(2)}` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300 light:text-slate-700 font-medium">
                      {r.credit_total > 0 ? `${company?.currency || "₹"}${Number(r.credit_total).toFixed(2)}` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white light:text-slate-900">
                      {Number(r.closing_balance).toFixed(2)} <span className="text-xs text-slate-500 font-bold uppercase">{r.closing_balance_type}</span>
                    </td>
                  </tr>
                ))}

                {/* Totals Summary Row */}
                {totals && (
                  <tr className="bg-slate-950 light:bg-slate-100 font-bold border-t-2 border-slate-800 light:border-slate-300 text-sm">
                    <td colSpan={2} className="py-4 px-4 uppercase text-xs tracking-wider text-slate-400 light:text-slate-600">
                      Audit Total
                    </td>
                    <td className="py-4 px-4 font-mono text-right">
                      <div className="flex flex-col text-xs leading-tight font-bold">
                        <span>Dr: {company?.currency || "₹"}{totals.opening_debit.toFixed(2)}</span>
                        <span>Cr: {company?.currency || "₹"}{totals.opening_credit.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-200 light:text-slate-800 text-sm">
                      {company?.currency || "₹"}{totals.debit_movements.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-200 light:text-slate-800 text-sm">
                      {company?.currency || "₹"}{totals.credit_movements.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-white light:text-slate-900 text-sm">
                      <div className="flex flex-col text-xs leading-tight font-bold">
                        <span>Dr: {company?.currency || "₹"}{totals.closing_debit.toFixed(2)}</span>
                        <span>Cr: {company?.currency || "₹"}{totals.closing_credit.toFixed(2)}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Toast Notification Container */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="p-4 rounded-2xl bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 text-xs font-semibold text-white light:text-slate-900 shadow-2xl backdrop-blur-md flex items-center gap-3 pointer-events-auto"
          >
            <div className="p-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
