"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getCurrentUser } from "../../utils/api";
import {
  Building2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Boxes,
  Layers,
  DollarSign
} from "lucide-react";

interface StockRow {
  id: string;
  name: string;
  sku?: string;
  purchase_price: number;
  selling_price: number;
  gst_percentage: number;
  quantity: number;
  valuation: number;
}

export default function StockSummaryReportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  // Report data
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("[StockSummary] Checking session...");
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
      fetchStockSummary(activeCompany.id);
    } catch (err) {
      console.error("[StockSummary Error] Active company failed:", err);
      router.push("/companies");
    }
  }, [router]);

  const fetchStockSummary = async (companyId: string) => {
    setLoading(true);
    setError("");
    console.log(`[StockSummary] Loading stock data...`);
    try {
      const data = await apiFetch(`/reports/stock-summary?company_id=${companyId}`);
      setStockRows(data.report.items || []);
      setTotals(data.report.totals || null);
    } catch (err: any) {
      console.error("[StockSummary Error] Load failed:", err);
      setError(err.message || "Failed to load Stock Summary.");
    } finally {
      setLoading(false);
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
      <main className="flex-1 max-w-[1400px] mx-auto px-6 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Stock Item list - 9 span */}
        <section className="lg:col-span-9 rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-6 shadow-2xl backdrop-blur-xl space-y-6">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Boxes className="w-6 h-6 text-brand-lime" />
              Stock Summary & Valuation
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Computes inventory balance values by multiplying physical quantities by unit purchase rates.
            </p>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-lime" />
              <p className="text-xs">Valuating inventory assets...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-slate-300 text-sm">{error}</p>
            </div>
          ) : stockRows.length === 0 ? (
            <div className="py-24 border border-dashed border-slate-800 rounded-3xl text-center">
              <p className="text-slate-400 text-xs">No active stock items defined in database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-900/50 rounded-2xl bg-brand-navy-dark/20">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                    <th className="py-3 px-4">Stock Item Name</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4 text-right">Cost Price ($)</th>
                    <th className="py-3 px-4 text-right">Selling Price ($)</th>
                    <th className="py-3 px-4 text-right">Current Stock</th>
                    <th className="py-3 px-4 text-right">Valuation ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {stockRows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-900/40 hover:bg-slate-900/10 text-slate-300">
                      <td className="py-3 px-4 font-bold text-white">{row.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{row.sku || "-"}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        ${Number(row.purchase_price).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        ${Number(row.selling_price).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-300">
                        {Number(row.quantity).toFixed(0)} PCS
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-white">
                        ${Number(row.valuation).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right Column: Valuation Summary - 3 span */}
        <section className="lg:col-span-3 space-y-6">
          <div className="rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-5 shadow-2xl backdrop-blur-xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-lime flex items-center gap-1.5 border-b border-slate-900 pb-2">
              Valuation summary
            </h3>

            <div className="space-y-3 pt-1 text-xs">
              <div className="flex items-center gap-3 py-1 border-b border-slate-900/40">
                <div className="p-2 bg-slate-900 rounded-lg text-slate-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-550 uppercase font-black">Stock Lines Count</span>
                  <p className="text-white font-bold font-mono mt-0.5">{totals?.total_items || 0} ITEMS</p>
                </div>
              </div>

              <div className="flex items-center gap-3 py-1 border-b border-slate-900/40">
                <div className="p-2 bg-slate-900 rounded-lg text-slate-400">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-550 uppercase font-black">Total Physical Stock</span>
                  <p className="text-white font-bold font-mono mt-0.5">{totals?.total_quantity || 0} PCS</p>
                </div>
              </div>

              <div className="flex items-center gap-3 py-1 border-b border-slate-900/40">
                <div className="p-2 bg-slate-900 rounded-lg text-brand-lime">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-550 uppercase font-black">Net Asset Valuation</span>
                  <p className="text-brand-lime font-black font-mono mt-0.5 text-sm">${totals?.total_valuation.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
