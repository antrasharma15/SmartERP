"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getCurrentUser } from "../utils/api";
import {
  Building2,
  Calendar,
  Search,
  Trash2,
  ChevronRight,
  ArrowLeft,
  X,
  Loader2,
  AlertCircle,
  HelpCircle,
  FileText,
  Eye,
  Plus
} from "lucide-react";

interface Voucher {
  id: string;
  voucher_number: string;
  voucher_date: string;
  reference: string | null;
  narration: string | null;
  party_name: string | null;
  total_amount: number;
}

export default function VouchersListPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  // Data lists
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Detail modal overlay
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [detailVoucher, setDetailVoucher] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Toast notifications state
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);

  // Trigger Toast helper
  const triggerToast = (text: string) => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Auth and company setup
  useEffect(() => {
    console.log("[VouchersList] Verifying session...");
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
      fetchVouchers(activeCompany.id);
    } catch (err) {
      console.error("[VouchersList Error] Parse active company failed:", err);
      localStorage.removeItem("activeCompany");
      router.push("/companies");
    }
  }, [router]);

  // Fetch vouchers
  const fetchVouchers = async (companyId: string) => {
    setLoading(true);
    setError("");
    console.log(`[VouchersList] Fetching historical vouchers...`);
    try {
      const data = await apiFetch(`/vouchers?company_id=${companyId}`);
      setVouchers(data.vouchers || []);
      console.log(`[VouchersList] Loaded ${data.vouchers?.length} vouchers.`);
    } catch (err: any) {
      console.error("[VouchersList Error] Fetch failed:", err);
      setError(err.message || "Failed to load vouchers register");
    } finally {
      setLoading(false);
    }
  };

  // Filter vouchers
  const filteredVouchers = vouchers.filter(v => {
    const query = searchQuery.toLowerCase().trim();
    return (
      v.voucher_number.toLowerCase().includes(query) ||
      (v.reference && v.reference.toLowerCase().includes(query)) ||
      (v.party_name && v.party_name.toLowerCase().includes(query)) ||
      v.voucher_date.includes(query)
    );
  });

  // Fetch detail view
  const fetchVoucherDetail = async (voucherId: string) => {
    setDetailLoading(true);
    setDetailVoucher(null);
    console.log(`[VouchersList] Fetching detail for ID: ${voucherId}`);
    try {
      const data = await apiFetch(`/vouchers/${voucherId}`);
      setDetailVoucher(data.voucher);
    } catch (err: any) {
      console.error("[VouchersList Error] Load details failed:", err);
      triggerToast(`Error loading details: ${err.message}`);
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

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTypingInInput = 
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "SELECT" || 
        document.activeElement?.tagName === "TEXTAREA";

      if (isTypingInInput && selectedVoucherId) {
        if (e.key === "Escape") {
          e.preventDefault();
          setSelectedVoucherId(null);
        }
        return;
      }

      // Escape
      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedVoucherId) {
          setSelectedVoucherId(null);
        } else {
          router.push("/dashboard");
        }
        return;
      }

      // CTRL + F Focus search
      if (e.ctrlKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Enter (View highlighted details)
      if (!selectedVoucherId && !isTypingInInput && e.key === "Enter") {
        e.preventDefault();
        const selected = filteredVouchers[selectedRowIndex];
        if (selected) {
          setSelectedVoucherId(selected.id);
        }
        return;
      }

      // Delete key (Void highlighted voucher)
      if (!selectedVoucherId && !isTypingInInput && e.key === "Delete") {
        e.preventDefault();
        const selected = filteredVouchers[selectedRowIndex];
        if (selected) {
          handleDeleteVoucher(selected.id, selected.voucher_number);
        }
        return;
      }

      // Arrow navigation
      if (!selectedVoucherId && !isTypingInInput && filteredVouchers.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedRowIndex(prev => (prev + 1) % filteredVouchers.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedRowIndex(prev => (prev - 1 + filteredVouchers.length) % filteredVouchers.length);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedVoucherId, filteredVouchers, selectedRowIndex, router]);

  // Delete/Void voucher
  const handleDeleteVoucher = async (voucherId: string, voucherNum: string) => {
    if (!confirm(`Are you sure you want to void and delete voucher "${voucherNum}"? This will reverse all ledger entries and stock quantities!`)) {
      return;
    }

    console.log(`[VouchersList] Deconciling and deleting voucher: ${voucherId}`);
    try {
      const response = await apiFetch(`/vouchers/${voucherId}`, {
        method: "DELETE"
      });
      console.log("[VouchersList] Deletion success:", response);
      triggerToast(`Voucher ${voucherNum} deleted and stock levels rolled back.`);
      fetchVouchers(company.id);
    } catch (err: any) {
      console.error("[VouchersList Error] Deletion failed:", err);
      triggerToast(`Error: ${err.message || "Deletion failed"}`);
    }
  };

  return (
    <div className="min-h-screen bg-brand-navy-dark text-slate-100 flex flex-col select-none relative overflow-hidden font-sans">
      {/* Header bar */}
      <header className="border-b border-brand-navy-light bg-brand-navy-dark/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-brand-lime hover:border-brand-lime/40 transition duration-200"
              title="Return to Dashboard (ESC)"
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

      {/* Main Grid list */}
      <main className="flex-1 max-w-[1400px] mx-auto px-6 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Vouchers list - 9 span */}
        <section className="lg:col-span-9 rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-6 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-brand-lime" />
                Vouchers Day Book Register
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                View audit trails of posted accounting transactions, journal double-entries, and stock levels.
              </p>
            </div>

            <button
              onClick={() => router.push("/vouchers/purchase")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-brand-navy-dark bg-brand-lime hover:bg-white transition duration-200 text-xs shadow-lg shadow-brand-lime/10"
            >
              <Plus className="w-4 h-4" />
              New Purchase Voucher (Alt+P)
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search voucher number, supplier reference or date... (Press Ctrl+F to focus)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedRowIndex(0);
              }}
              className="w-full pl-11 pr-4 py-3 bg-brand-navy-dark/60 border border-slate-850 rounded-2xl text-slate-200 placeholder-slate-500 outline-none focus:border-brand-lime transition text-xs font-semibold"
            />
          </div>

          {/* Vouchers Table */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-lime" />
              <p className="text-xs font-medium">Fetching transaction journals...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-slate-300 text-sm">{error}</p>
              <button
                onClick={() => fetchVouchers(company.id)}
                className="px-5 py-2 bg-brand-navy-light/40 border border-slate-800 rounded-xl hover:text-white text-xs font-bold"
              >
                Retry Query
              </button>
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="py-24 border border-dashed border-slate-800 rounded-3xl text-center">
              <p className="text-slate-400 text-xs">No vouchers match search filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-900/50 rounded-2xl bg-brand-navy-dark/20">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                    <th className="py-3 px-4">Voucher No</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Party Account (Credited)</th>
                    <th className="py-3 px-4 text-right">Grand Total ($)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVouchers.map((voucher, idx) => {
                    const isSelected = selectedRowIndex === idx;
                    return (
                      <tr
                        key={voucher.id}
                        onClick={() => setSelectedRowIndex(idx)}
                        onDoubleClick={() => setSelectedVoucherId(voucher.id)}
                        className={`border-b border-slate-900/40 transition duration-150 cursor-pointer ${
                          isSelected
                            ? "bg-brand-lime/10 text-brand-lime font-bold border-l-4 border-l-brand-lime"
                            : "text-slate-300 hover:bg-slate-900/30"
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold">
                          <span className="flex items-center gap-1.5">
                            {isSelected && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                            {voucher.voucher_number}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">{voucher.voucher_date}</td>
                        <td className="py-3 px-4 text-slate-400 font-semibold">{voucher.reference || "N/A"}</td>
                        <td className="py-3 px-4 font-bold">{voucher.party_name || "PRIMARY"}</td>
                        <td className="py-3 px-4 text-right font-mono font-black">
                          ${Number(voucher.total_amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVoucherId(voucher.id);
                              }}
                              className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVoucher(voucher.id, voucher.voucher_number);
                              }}
                              className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400"
                              title="Delete / Void Voucher"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Guide Legend */}
          <div className="flex justify-between items-center bg-slate-950/20 border border-slate-900/60 p-3 rounded-2xl text-[10px] text-slate-400 font-mono">
            <span>Use ↑↓ keys to select, Enter to view ledger entries, Delete to void</span>
            <span>ALT+P = Create Purchase Voucher | ESC = Home</span>
          </div>
        </section>

        {/* Right Column: Sidebar Stats - 3 span */}
        <section className="lg:col-span-3 space-y-6">
          <div className="rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-5 shadow-2xl backdrop-blur-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-lime flex items-center gap-1.5 border-b border-slate-900 pb-2">
              Day Book Info
            </h3>
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-900/40">
                <span className="text-slate-400">Total Vouchers</span>
                <span className="font-bold text-white font-mono">{vouchers.length}</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                This register shows all double-entry transaction listings. Voiding transactions automatically restores physical stock values.
              </p>
            </div>
          </div>

          {/* Help Drawer */}
          <div className="rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-5 shadow-2xl backdrop-blur-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-1.5 border-b border-slate-900 pb-2">
              Quick Shortcuts
            </h3>
            <div className="space-y-2.5 pt-3 text-[10px] font-mono text-slate-400">
              <div className="flex justify-between items-center">
                <span>View Details</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-brand-lime rounded">Enter</span>
              </div>
              <div className="flex justify-between items-center">
                <span>New Purchase</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-white rounded">Alt + P</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Delete Voucher</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-white rounded">Delete</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Focus search</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-white rounded">Ctrl + F</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Voucher Detail Modal Overlay */}
      {selectedVoucherId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-brand-navy-dark border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 font-mono">
                <FileText className="w-5 h-5 text-brand-lime" />
                Voucher Details: {detailVoucher?.voucher_number || "Loading..."}
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
                <p className="text-xs">Fetching voucher postings...</p>
              </div>
            ) : detailVoucher ? (
              <div className="space-y-6 text-xs font-semibold">
                
                {/* Meta details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/20 p-4 border border-slate-900 rounded-2xl">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Date</p>
                    <p className="text-white font-mono mt-0.5">{detailVoucher.voucher_date}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Reference #</p>
                    <p className="text-white mt-0.5">{detailVoucher.reference || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Voucher Type</p>
                    <p className="text-white uppercase mt-0.5 font-mono">{detailVoucher.voucher_type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Created At</p>
                    <p className="text-white font-mono mt-0.5">{new Date(detailVoucher.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* Ledger Double-Entry postings */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-brand-lime">Ledger Double-Entry Postings</h4>
                  <div className="border border-slate-900 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 uppercase font-black tracking-wider text-[9px]">
                          <th className="py-2 px-4">Ledger Account</th>
                          <th className="py-2 px-4">Type</th>
                          <th className="py-2 px-4 text-right">Debit Amount ($)</th>
                          <th className="py-2 px-4 text-right">Credit Amount ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailVoucher.entries?.map((entry: any) => (
                          <tr key={entry.id} className="border-b border-slate-900/40 text-slate-300">
                            <td className="py-2 px-4 font-bold">{entry.ledger_name}</td>
                            <td className="py-2 px-4 uppercase text-[10px] text-slate-500">{entry.account_type}</td>
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

                {/* Inventory postings */}
                {detailVoucher.items && detailVoucher.items.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-brand-lime">Inventory Items Purchased</h4>
                    <div className="border border-slate-900 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 uppercase font-black tracking-wider text-[9px]">
                            <th className="py-2 px-4">Stock Item Name</th>
                            <th className="py-2 px-4">SKU</th>
                            <th className="py-2 px-4 text-right">Quantity</th>
                            <th className="py-2 px-4 text-right">Purchase Rate ($)</th>
                            <th className="py-2 px-4 text-right">Total Cost ($)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailVoucher.items.map((item: any) => (
                            <tr key={item.id} className="border-b border-slate-900/40 text-slate-300">
                              <td className="py-2 px-4 font-bold">{item.item_name}</td>
                              <td className="py-2 px-4 font-mono text-slate-500">{item.sku || "N/A"}</td>
                              <td className="py-2 px-4 text-right font-mono">{item.quantity}</td>
                              <td className="py-2 px-4 text-right font-mono">${Number(item.rate).toFixed(2)}</td>
                              <td className="py-2 px-4 text-right font-mono text-white">${Number(item.amount).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Narration */}
                {detailVoucher.narration && (
                  <div className="space-y-1.5 bg-slate-950/10 p-3.5 border border-slate-900 rounded-2xl">
                    <p className="text-[10px] text-slate-500 uppercase font-black">Narration / remarks</p>
                    <p className="text-slate-300 italic mt-0.5">"{detailVoucher.narration}"</p>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-slate-900">
                  <button
                    type="button"
                    onClick={() => setSelectedVoucherId(null)}
                    className="px-6 py-2.5 bg-brand-lime text-brand-navy-dark hover:bg-white font-bold rounded-xl transition"
                  >
                    Close View
                  </button>
                </div>

              </div>
            ) : (
              <p className="text-center py-12 text-slate-400 text-xs">Voucher details unavailable.</p>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification Container */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="p-4 rounded-2xl bg-brand-navy-light/95 border border-slate-800 text-xs font-semibold text-white shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in-left pointer-events-auto"
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
