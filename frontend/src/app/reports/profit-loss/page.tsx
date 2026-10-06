"use client";

import Loader from "../../components/Loader";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getCurrentUser } from "../../utils/api";
import AppLayout from "../../components/AppLayout";
import Logo from "../../components/Logo";
import {
  Building2,
  Calendar,
  ArrowLeft,
  Loader2,
  AlertCircle,
  TrendingUp,
  HelpCircle,
  TrendingDown,
  Download
} from "lucide-react";
import { exportToCsv } from "../../utils/exportCsv";

interface PLRow {
  name: string;
  amount: number;
}

export default function ProfitLossReportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  // Filter params
  const [startDate, setStartDate] = useState("2026-04-01");
  const [endDate, setEndDate] = useState("2026-06-28");

  // Report data
  const [revenueItems, setRevenueItems] = useState<PLRow[]>([]);
  const [expenseItems, setExpenseItems] = useState<PLRow[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("[ProfitLoss] Checking session...");
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
      fetchProfitLoss(activeCompany.id, startDate, endDate);
    } catch (err) {
      console.error("[ProfitLoss Error] Active company failed:", err);
      router.push("/companies");
    }
  }, [router]);

  const fetchProfitLoss = async (companyId: string, start: string, end: string) => {
    setLoading(true);
    setError("");
    console.log(`[ProfitLoss] Fetching details from ${start} to ${end}`);
    try {
      const data = await apiFetch(`/reports/profit-loss?company_id=${companyId}&start_date=${start}&end_date=${end}`);
      setRevenueItems(data.report?.revenue || []);
      setExpenseItems(data.report?.expenses || []);
      setTotals(data.report?.totals || null);
    } catch (err: any) {
      console.error("[ProfitLoss Error] Load failed:", err);
      setError(err.message || "Failed to load Profit & Loss statement.");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = () => {
    if (company) {
      fetchProfitLoss(company.id, startDate, endDate);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Section",
      "Account Name",
      `Amount (${company?.currency || "₹"})`
    ];
    const rows: (string | number)[][] = [];
    rows.push(["REVENUE & EARNINGS", "", ""]);
    revenueItems.forEach(item => {
      rows.push(["Revenue", item.name, Number(item.amount).toFixed(2)]);
    });
    rows.push(["TOTAL REVENUE", "", Number(totals?.revenue_total || 0).toFixed(2)]);
    rows.push(["", "", ""]);
    rows.push(["OPERATING EXPENSES", "", ""]);
    expenseItems.forEach(item => {
      rows.push(["Expense", item.name, Number(item.amount).toFixed(2)]);
    });
    rows.push(["TOTAL EXPENDITURE", "", Number(totals?.expense_total || 0).toFixed(2)]);
    if (totals) {
      rows.push(["", "", ""]);
      rows.push(["NET PROFIT / (LOSS)", "", Number(totals.net_profit || 0).toFixed(2)]);
    }
    exportToCsv("Profit_Loss_Report", headers, rows);
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

  const netProfit = totals ? totals.net_profit : 0;
  const isLoss = netProfit < 0;

  return (
    <AppLayout
      pageTitle="Profit & Loss Statement"
      pageSubtitle="Summarizes financial revenues and operating expenses to calculate net business profit margins."
    >
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 light:border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-white light:text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-500" />
              Income & Expense Statement
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
              title="Export Profit & Loss to CSV"
            >
              <Download className="w-4 h-4 text-red-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Profitability KPI Card */}
        {totals && (
          <div className={`p-5 rounded-2xl border text-sm font-bold flex items-center justify-between ${
            isLoss 
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 light:text-emerald-700"
          }`}>
            <div className="flex items-center gap-3.5">
              <div className={`p-3 rounded-xl border ${
                isLoss ? "bg-red-500/20 border-red-500/30" : "bg-emerald-500/20 border-emerald-500/30"
              }`}>
                {isLoss ? <TrendingDown className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-xs text-slate-400 light:text-slate-600 uppercase font-black tracking-wider">Net Operations Status</span>
                <p className="text-white light:text-slate-900 font-bold text-base mt-0.5">
                  {isLoss 
                    ? `Company is running a Net Loss of ${company?.currency || "₹"}${Math.abs(netProfit).toFixed(2)}`
                    : `Company is generating a Net Profit of ${company?.currency || "₹"}${netProfit.toFixed(2)}`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Net Margin</span>
              <p className={`text-xl font-black font-mono mt-0.5 ${isLoss ? "text-red-400" : "text-emerald-400 light:text-emerald-700"}`}>
                {company?.currency || "₹"}{netProfit.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Dual Column Layout */}
        {loading ? (
          <Loader kind="report" label="Computing Profit & Loss" />
        ) : error ? (
          <div className="py-16 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-slate-300 light:text-slate-700 text-sm">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Expenses & Costs */}
            <div className="rounded-3xl bg-slate-900/30 light:bg-white border border-slate-800 light:border-slate-200 p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-red-500 border-b border-slate-800 light:border-slate-200 pb-2.5">
                  Operating Expenses & Debits
                </h3>
                {expenseItems.length === 0 ? (
                  <p className="text-slate-500 italic py-8 text-center text-sm">No active expense entries.</p>
                ) : (
                  <div className="space-y-3">
                    {expenseItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-800/50 light:border-slate-100 text-sm">
                        <span className="text-slate-200 light:text-slate-800 font-bold">{item.name}</span>
                        <span className="font-mono text-white light:text-slate-900 font-bold">{company?.currency || "₹"}{item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center bg-slate-950 light:bg-slate-50 p-4 border border-slate-800 light:border-slate-200 rounded-2xl text-sm">
                <span className="text-xs text-slate-400 light:text-slate-600 uppercase font-black tracking-wider">Total Expenditure</span>
                <span className="font-mono font-black text-white light:text-slate-900 text-base">{company?.currency || "₹"}{totals?.expense_total.toFixed(2)}</span>
              </div>
            </div>

            {/* Right Column: Revenues & Earnings */}
            <div className="rounded-3xl bg-slate-900/30 light:bg-white border border-slate-800 light:border-slate-200 p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 light:text-emerald-700 border-b border-slate-800 light:border-slate-200 pb-2.5">
                  Revenues & Credit Earnings
                </h3>
                {revenueItems.length === 0 ? (
                  <p className="text-slate-500 italic py-8 text-center text-sm">No active sales revenue entries.</p>
                ) : (
                  <div className="space-y-3">
                    {revenueItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-800/50 light:border-slate-100 text-sm">
                        <span className="text-slate-200 light:text-slate-800 font-bold">{item.name}</span>
                        <span className="font-mono text-white light:text-slate-900 font-bold">{company?.currency || "₹"}{item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center bg-slate-950 light:bg-slate-50 p-4 border border-slate-800 light:border-slate-200 rounded-2xl text-sm">
                <span className="text-xs text-slate-400 light:text-slate-600 uppercase font-black tracking-wider">Total Revenues</span>
                <span className="font-mono font-black text-white light:text-slate-900 text-base">{company?.currency || "₹"}{totals?.revenue_total.toFixed(2)}</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </AppLayout>
  );
}
