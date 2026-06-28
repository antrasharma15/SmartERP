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
  ClipboardList,
  Eye,
  X
} from "lucide-react";

interface VoucherRow {
  voucher_id: string;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  reference?: string;
  narration?: string;
  total_amount: number;
}

export default function DayBookReportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  // Filter params
  const [startDate, setStartDate] = useState("2026-04-01");
  const [endDate, setEndDate] = useState("2026-06-28");

  // Report data
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Drill-down slide-over
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [voucherDetail, setVoucherDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    console.log("[DayBook] Checking session...");
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
      fetchDayBook(activeCompany.id, startDate, endDate);
    } catch (err) {
      console.error("[DayBook Error] Active company failed:", err);
      router.push("/companies");
    }
  }, [router]);

  const fetchDayBook = async (companyId: string, start: string, end: string) => {
    setLoading(true);
    setError("");
    console.log(`[DayBook] Querying logs from ${start} to ${end}`);
    try {
      const data = await apiFetch(`/reports/day-book?company_id=${companyId}&start_date=${start}&end_date=${end}`);
      setVouchers(data.report || []);
    } catch (err: any) {
      console.error("[DayBook Error] Load failed:", err);
      setError(err.message || "Failed to load Day Book logs.");
    } finally {
      setLoading(false);
    }
  };

  const fetchVoucherDetail = async (voucherId: string) => {
    setDetailLoading(true);
    setVoucherDetail(null);
    console.log(`[DayBook] Drill-down query details for ID: ${voucherId}`);
    try {
      const data = await apiFetch(`/vouchers/${voucherId}`);
      setVoucherDetail(data.voucher);
    } catch (err: any) {
      console.error("[DayBook Error] Drill-down load failed:", err);
      setSelectedVoucherId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVoucherId) {
      fetchVoucherDetail(selectedVoucherId);
    }
  }, [selectedVoucherId]);

  const handleDateChange = () => {
    if (company) {
      fetchDayBook(company.id, startDate, endDate);
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
        if (selectedVoucherId) {
          setSelectedVoucherId(null);
        } else {
          router.push("/reports");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedVoucherId, router]);

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
              <ClipboardList className="w-6 h-6 text-brand-lime" />
              Day Book Audit Register
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Lists transactional log registers chronologically, allowing full detail drill-down queries.
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

        {/* Audit Log Table */}
        <div className="rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-6 shadow-2xl backdrop-blur-xl">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-lime" />
              <p className="text-xs">Fetching transactions log...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-slate-300 text-sm">{error}</p>
            </div>
          ) : vouchers.length === 0 ? (
            <div className="py-24 border border-dashed border-slate-800 rounded-3xl text-center">
              <p className="text-slate-400 text-xs">No transactions recorded inside selected bounds.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-900/50 rounded-2xl bg-brand-navy-dark/20">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                    <th className="py-3 px-4">Voucher No</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 font-mono">Date</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Narration</th>
                    <th className="py-3 px-4 text-right">Debit Total ($)</th>
                    <th className="py-3 px-4 text-center">Audit</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v) => {
                    const d = new Date(v.voucher_date);
                    const localDate = isNaN(d.getTime()) ? v.voucher_date : d.toISOString().split("T")[0];
                    return (
                      <tr key={v.voucher_id} className="border-b border-slate-900/40 hover:bg-slate-900/10 text-slate-300">
                        <td className="py-3 px-4 font-bold text-white font-mono">{v.voucher_number}</td>
                        <td className="py-3 px-4 uppercase text-[10px] text-slate-500 font-mono font-black">{v.voucher_type}</td>
                        <td className="py-3 px-4 font-mono">{localDate}</td>
                        <td className="py-3 px-4 font-mono text-slate-450">{v.reference || "-"}</td>
                        <td className="py-3 px-4 italic text-slate-400">{v.narration || "N/A"}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          ${Number(v.total_amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedVoucherId(v.voucher_id)}
                            className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Drill-down Detail Modal Overlay */}
      {selectedVoucherId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl bg-brand-navy-dark border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 font-mono">
                Voucher Drill-down: {voucherDetail?.voucher_number || "Loading..."}
              </h2>
              <button
                onClick={() => setSelectedVoucherId(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-brand-lime" />
                <p className="text-xs">Loading ledger splits...</p>
              </div>
            ) : voucherDetail ? (
              <div className="space-y-6 text-xs font-semibold">
                
                {/* Meta details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/20 p-4 border border-slate-900 rounded-2xl">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Voucher Type</p>
                    <p className="text-white uppercase mt-0.5 font-mono">{voucherDetail.voucher_type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Date</p>
                    <p className="text-white font-mono mt-0.5">
                      {new Date(voucherDetail.voucher_date).toISOString().split("T")[0]}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Reference ID</p>
                    <p className="text-white font-mono mt-0.5">{voucherDetail.reference || "None"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Narration</p>
                    <p className="text-slate-350 italic mt-0.5">{voucherDetail.narration || "No notes"}</p>
                  </div>
                </div>

                {/* Double Entry Ledger Splits */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-brand-lime">Accounting Ledger Splits</h4>
                  <div className="border border-slate-900 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 uppercase font-black tracking-wider text-[9px]">
                          <th className="py-2 px-4">Ledger Name</th>
                          <th className="py-2 px-4">Type</th>
                          <th className="py-2 px-4 text-right">Debit ($)</th>
                          <th className="py-2 px-4 text-right">Credit ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {voucherDetail.entries?.map((entry: any) => (
                          <tr key={entry.id} className="border-b border-slate-900/40 text-slate-300">
                            <td className="py-2 px-4 font-bold">{entry.ledger_name}</td>
                            <td className="py-2 px-4 uppercase text-[10px] text-slate-500">{entry.ledger_type}</td>
                            <td className="py-2 px-4 text-right font-mono">
                              {Number(entry.debit_amount) > 0 ? `$${Number(entry.debit_amount).toFixed(2)}` : ""}
                            </td>
                            <td className="py-2 px-4 text-right font-mono">
                              {Number(entry.credit_amount) > 0 ? `$${Number(entry.credit_amount).toFixed(2)}` : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Itemized inventory rows */}
                {voucherDetail.items && voucherDetail.items.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-brand-lime">Inventory Movement Row Details</h4>
                    <div className="border border-slate-900 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 uppercase font-black tracking-wider text-[9px]">
                            <th className="py-2 px-4">Stock Name</th>
                            <th className="py-2 px-4">SKU</th>
                            <th className="py-2 px-4 text-right">Quantity</th>
                            <th className="py-2 px-4 text-right">Rate ($)</th>
                            <th className="py-2 px-4 text-right">Amount ($)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {voucherDetail.items.map((item: any) => (
                            <tr key={item.id} className="border-b border-slate-900/40 text-slate-300">
                              <td className="py-2 px-4 font-bold">{item.item_name}</td>
                              <td className="py-2 px-4 font-mono text-slate-500">{item.sku || "-"}</td>
                              <td className="py-2 px-4 text-right font-mono">{item.quantity}</td>
                              <td className="py-2 px-4 text-right font-mono">${Number(item.rate).toFixed(2)}</td>
                              <td className="py-2 px-4 text-right font-mono text-white">
                                ${(Number(item.quantity) * Number(item.rate)).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-slate-900">
                  <button
                    onClick={() => setSelectedVoucherId(null)}
                    className="px-6 py-2.5 bg-brand-lime text-brand-navy-dark hover:bg-white font-bold rounded-xl transition"
                  >
                    Close View
                  </button>
                </div>

              </div>
            ) : (
              <p className="text-center py-12 text-slate-400 text-xs">Voucher data unavailable.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
