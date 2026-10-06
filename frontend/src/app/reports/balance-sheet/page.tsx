"use client";

import Loader from "../../components/Loader";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getCurrentUser } from "../../utils/api";
import AppLayout from "../../components/AppLayout";
import {
  Building2,
  Calendar,
  ArrowLeft,
  Loader2,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Download
} from "lucide-react";
import { exportToCsv } from "../../utils/exportCsv";

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
      setAssetItems(data.report?.assets || []);
      setLiabilityItems(data.report?.liabilities || []);
      setTotals(data.report?.totals || null);
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

  const handleExportCsv = () => {
    const headers = [
      "Section",
      "Account Name",
      `Amount (${company?.currency || "₹"})`
    ];
    const rows: (string | number)[][] = [];
    rows.push(["LIABILITIES & EQUITY", "", ""]);
    liabilityItems.forEach(item => {
      rows.push(["Liability/Equity", item.name, Number(item.amount).toFixed(2)]);
    });
    rows.push(["TOTAL LIABILITIES & EQUITY", "", Number(totals?.liabilities_total || 0).toFixed(2)]);
    rows.push(["", "", ""]);
    rows.push(["ASSETS", "", ""]);
    assetItems.forEach(item => {
      rows.push(["Asset", item.name, Number(item.amount).toFixed(2)]);
    });
    rows.push(["TOTAL ASSETS", "", Number(totals?.assets_total || 0).toFixed(2)]);
    if (totals) {
      rows.push(["", "", ""]);
      rows.push(["DIFFERENCE", "", Number(totals.balance_difference || 0).toFixed(2)]);
    }
    exportToCsv("Balance_Sheet_Report", headers, rows);
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
    <AppLayout
      pageTitle="Company Balance Sheet"
      pageSubtitle="Displays structural assets, capital equity accounts, and payables at a specific point in time."
    >
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 light:border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-white light:text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-red-500" />
              Balance Sheet Statement
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
              title="Export Balance Sheet to CSV"
            >
              <Download className="w-4 h-4 text-red-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Verification Status */}
        {totals && (
          <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between ${
            holdsParity 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 light:text-emerald-700"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            <div className="flex items-center gap-2.5">
              {holdsParity ? (
                <>
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Balance sheet equation holds perfect parity: Assets match Liabilities & Equity.</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>Equations unbalanced. Assets do not equal liabilities plus reserves.</span>
                </>
              )}
            </div>
            <div className="font-mono text-right font-black text-sm">
              Diff: {company?.currency || "₹"}{totals.balance_difference.toFixed(2)}
            </div>
          </div>
        )}

        {/* Dual Columns view */}
        {loading ? (
          <Loader kind="scale" label="Reconciling statements" />
        ) : error ? (
          <div className="py-16 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-slate-300 light:text-slate-700 text-sm">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Liabilities & Capital */}
            <div className="rounded-3xl bg-slate-900/30 light:bg-white border border-slate-800 light:border-slate-200 p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-red-500 border-b border-slate-800 light:border-slate-200 pb-2.5">
                  Liabilities, Equity & Capital Accounts
                </h3>
                {liabilityItems.length === 0 ? (
                  <p className="text-slate-500 italic py-8 text-center text-sm">No active liability items.</p>
                ) : (
                  <div className="space-y-3">
                    {liabilityItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-800/50 light:border-slate-100 text-sm">
                        <span className="text-slate-200 light:text-slate-800 font-bold">{item.name}</span>
                        <span className="font-mono text-white light:text-slate-900 font-bold">
                          {item.amount < 0 ? `-${company?.currency || "₹"}${Math.abs(item.amount).toFixed(2)}` : `${company?.currency || "₹"}${item.amount.toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center bg-slate-950 light:bg-slate-50 p-4 border border-slate-800 light:border-slate-200 rounded-2xl text-sm">
                <span className="text-xs text-slate-400 light:text-slate-600 uppercase font-black tracking-wider">Total Liabilities & Equity</span>
                <span className="font-mono font-black text-white light:text-slate-900 text-base">{company?.currency || "₹"}{totals?.liabilities_total.toFixed(2)}</span>
              </div>
            </div>

            {/* Right Column: Assets */}
            <div className="rounded-3xl bg-slate-900/30 light:bg-white border border-slate-800 light:border-slate-200 p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 light:text-emerald-700 border-b border-slate-800 light:border-slate-200 pb-2.5">
                  Assets & Debit Values
                </h3>
                {assetItems.length === 0 ? (
                  <p className="text-slate-500 italic py-8 text-center text-sm">No active asset records.</p>
                ) : (
                  <div className="space-y-3">
                    {assetItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-800/50 light:border-slate-100 text-sm">
                        <span className="text-slate-200 light:text-slate-800 font-bold">{item.name}</span>
                        <span className="font-mono text-white light:text-slate-900 font-bold">{company?.currency || "₹"}{item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center bg-slate-950 light:bg-slate-50 p-4 border border-slate-800 light:border-slate-200 rounded-2xl text-sm">
                <span className="text-xs text-slate-400 light:text-slate-600 uppercase font-black tracking-wider">Total Assets</span>
                <span className="font-mono font-black text-white light:text-slate-900 text-base">{company?.currency || "₹"}{totals?.assets_total.toFixed(2)}</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </AppLayout>
  );
}
