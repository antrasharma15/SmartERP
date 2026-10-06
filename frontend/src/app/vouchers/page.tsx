"use client";

import Loader from "../components/Loader";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getCurrentUser } from "../utils/api";
import AppLayout from "../components/AppLayout";
import Logo from "../components/Logo";
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
  Plus,
  Download
} from "lucide-react";
import { exportToCsv } from "../utils/exportCsv";

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

  // Pagination states
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRowIndex(0);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredVouchers.length / ITEMS_PER_PAGE) || 1;
  const paginatedVouchers = filteredVouchers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedRowIndex >= paginatedVouchers.length && paginatedVouchers.length > 0) {
      setSelectedRowIndex(paginatedVouchers.length - 1);
    }
  }, [paginatedVouchers.length, selectedRowIndex]);

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

      // ALT + P (New Purchase Voucher)
      if (e.altKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        console.log("[VouchersList Keyboard] ALT+P pressed. Routing to Purchase Voucher creation.");
        router.push("/vouchers/purchase");
        return;
      }

      // ALT + S (New Sales Voucher)
      if (e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        console.log("[VouchersList Keyboard] ALT+S pressed. Routing to Sales Voucher creation.");
        router.push("/vouchers/sales");
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
        const selected = paginatedVouchers[selectedRowIndex];
        if (selected) {
          setSelectedVoucherId(selected.id);
        }
        return;
      }

      // Delete key (Void highlighted voucher)
      if (!selectedVoucherId && !isTypingInInput && e.key === "Delete") {
        e.preventDefault();
        const selected = paginatedVouchers[selectedRowIndex];
        if (selected) {
          handleDeleteVoucher(selected.id, selected.voucher_number);
        }
        return;
      }

      // Arrow navigation
      if (!selectedVoucherId && !isTypingInInput && paginatedVouchers.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedRowIndex(prev => (prev + 1) % paginatedVouchers.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedRowIndex(prev => (prev - 1 + paginatedVouchers.length) % paginatedVouchers.length);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedVoucherId, paginatedVouchers, selectedRowIndex, router]);

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

  const handleExportCsv = () => {
    const headers = [
      "Voucher Number",
      "Date",
      "Reference",
      "Party Account",
      `Total Amount (${company?.currency || "₹"})`
    ];
    const rows = filteredVouchers.map(v => [
      v.voucher_number,
      v.voucher_date,
      v.reference || "-",
      v.party_name || "PRIMARY",
      Number(v.total_amount).toFixed(2)
    ]);
    exportToCsv("Vouchers_Journal_Report", headers, rows);
    triggerToast("Vouchers Journal CSV exported successfully");
  };

  return (
    <AppLayout
      pageTitle="Vouchers Day Book Register"
      pageSubtitle="View audit trails of posted accounting transactions, journal double-entries, and stock levels."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Vouchers list - 9 span */}
        <section className="lg:col-span-8 xl:col-span-9 rounded-3xl bg-[#0b1528]/50 light:bg-white border border-slate-800/80 light:border-slate-200 p-6 shadow-xl backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 light:border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-white light:text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-500" />
                Transactions Journal
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-slate-200 light:text-slate-800 bg-slate-800 light:bg-slate-100 border border-slate-700 light:border-slate-300 hover:bg-slate-700 transition duration-200 text-sm shadow-sm"
                title="Export Vouchers to CSV"
              >
                <Download className="w-4 h-4 text-red-500" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => router.push("/vouchers/purchase")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition duration-200 text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Purchase (Alt+P)
              </button>
              <button
                onClick={() => router.push("/vouchers/sales")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-slate-200 light:text-slate-800 bg-slate-800 light:bg-slate-100 border border-slate-700 light:border-slate-300 hover:bg-slate-700 light:hover:bg-slate-200 transition duration-200 text-sm"
              >
                <Plus className="w-4 h-4" />
                Sales (Alt+S)
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search voucher number, supplier reference or date... (Press Ctrl+F to focus)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedRowIndex(0);
              }}
              className="w-full pl-11 pr-4 py-3 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-2xl text-white light:text-slate-900 placeholder-slate-500 outline-none focus:border-red-500 transition text-sm font-semibold"
            />
          </div>

          {/* Vouchers Table */}
          {loading ? (
            <Loader kind="voucher" label="Fetching transaction journals" />
          ) : error ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-slate-300 light:text-slate-700 text-sm">{error}</p>
              <button
                onClick={() => fetchVouchers(company.id)}
                className="px-5 py-2 bg-slate-800 border border-slate-700 rounded-xl hover:text-white text-sm font-bold text-slate-200"
              >
                Retry Query
              </button>
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="py-24 border border-dashed border-slate-800 light:border-slate-200 rounded-3xl text-center">
              <p className="text-slate-400 light:text-slate-600 text-sm">No vouchers match search filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-800 light:border-slate-200 rounded-2xl bg-slate-900/30 light:bg-white">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 light:border-slate-200 bg-slate-950 light:bg-slate-100 text-slate-400 light:text-slate-600 uppercase font-black tracking-wider text-xs">
                    <th className="py-3.5 px-4">Voucher No</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Reference</th>
                    <th className="py-3.5 px-4">Party Account (Credited)</th>
                    <th className="py-3.5 px-4 text-right">Grand Total ({company?.currency || "₹"})</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {paginatedVouchers.map((voucher, idx) => {
                    const isSelected = selectedRowIndex === idx;
                    return (
                      <tr
                        key={voucher.id}
                        onClick={() => setSelectedRowIndex(idx)}
                        onDoubleClick={() => setSelectedVoucherId(voucher.id)}
                        className={`border-b border-slate-800/50 light:border-slate-100 transition duration-150 cursor-pointer ${
                          isSelected
                            ? "bg-red-500/10 light:bg-red-50 text-red-500 light:text-red-600 font-bold border-l-4 border-l-red-500"
                            : "text-slate-300 light:text-slate-700 hover:bg-slate-800/40 light:hover:bg-slate-100/60"
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold">
                          <span className="flex items-center gap-1.5">
                            {isSelected && <ChevronRight className="w-4 h-4 shrink-0" />}
                            {voucher.voucher_number}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium">{voucher.voucher_date}</td>
                        <td className="py-3.5 px-4 text-slate-400 light:text-slate-600 font-medium">{voucher.reference || "N/A"}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-200 light:text-slate-800">{voucher.party_name || "PRIMARY"}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-white light:text-slate-900">
                          {company?.currency || "₹"}{Number(voucher.total_amount).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVoucherId(voucher.id);
                              }}
                              className="p-2 rounded-lg bg-slate-800 light:bg-slate-100 border border-slate-700 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black transition"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVoucher(voucher.id, voucher.voucher_number);
                              }}
                              className="p-2 rounded-lg bg-slate-800 light:bg-slate-100 border border-slate-700 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-red-400 transition"
                              title="Delete / Void Voucher"
                            >
                              <Trash2 className="w-4 h-4" />
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

          {/* Pagination Toolbar */}
          {filteredVouchers.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-800 light:border-slate-200 text-xs">
              <p className="text-slate-400 light:text-slate-600">
                Showing <span className="font-bold text-white light:text-slate-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                <span className="font-bold text-white light:text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredVouchers.length)}</span> of{" "}
                <span className="font-bold text-white light:text-slate-900">{filteredVouchers.length}</span> vouchers
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setCurrentPage(prev => Math.max(prev - 1, 1)); setSelectedRowIndex(0); }}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white text-slate-300 light:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 light:hover:bg-slate-100 font-semibold"
                  >
                    Previous
                  </button>

                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 3 + i + 1;
                      if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => { setCurrentPage(pageNum); setSelectedRowIndex(0); }}
                        className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition ${
                          currentPage === pageNum
                            ? "bg-red-600 text-white"
                            : "border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white text-slate-300 light:text-slate-700 hover:bg-slate-800 light:hover:bg-slate-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); setSelectedRowIndex(0); }}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white text-slate-300 light:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 light:hover:bg-slate-100 font-semibold"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Guide Legend */}
          <div className="flex justify-between items-center bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 p-3 rounded-2xl text-[10px] text-slate-400 light:text-slate-600 font-mono">
            <span>Use ↑↓ keys to select, Enter to view ledger entries, Delete to void</span>
            <span>ALT+P = Purchase | ALT+S = Sales | ESC = Home</span>
          </div>
        </section>

        {/* Right Column: Sidebar Stats - 3 span */}
        <section className="lg:col-span-4 xl:col-span-3 space-y-6">
          <div className="rounded-3xl bg-[#0b1528]/50 light:bg-white border border-slate-800/80 light:border-slate-200 p-5 shadow-xl backdrop-blur-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-red flex items-center gap-1.5 border-b border-slate-800 light:border-slate-200 pb-2">
              Day Book Info
            </h3>
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/50 light:border-slate-100">
                <span className="text-slate-400 light:text-slate-600">Total Vouchers</span>
                <span className="font-bold text-white light:text-slate-900 font-mono">{vouchers.length}</span>
              </div>
              <p className="text-[10px] text-slate-500 light:text-slate-500 leading-relaxed font-semibold">
                This register shows all double-entry transaction listings. Voiding transactions automatically restores physical stock values.
              </p>
            </div>
          </div>

          {/* Help Drawer */}
          <div className="rounded-3xl bg-[#0b1528]/50 light:bg-white border border-slate-800/80 light:border-slate-200 p-5 shadow-xl backdrop-blur-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-white light:text-slate-900 flex items-center gap-1.5 border-b border-slate-800 light:border-slate-200 pb-2">
              Quick Shortcuts
            </h3>
            <div className="space-y-2.5 pt-3 text-[10px] font-mono text-slate-400 light:text-slate-600">
              <div className="flex justify-between items-center">
                <span>View Details</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-brand-red font-bold rounded">Enter</span>
              </div>
              <div className="flex justify-between items-center">
                <span>New Purchase</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-white light:text-slate-900 rounded">Alt + P</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Delete Voucher</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-white light:text-slate-900 rounded">Delete</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Focus search</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-white light:text-slate-900 rounded">Ctrl + F</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Voucher Detail Modal Overlay */}
      {selectedVoucherId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 light:border-slate-200 pb-3">
              <h2 className="text-xl font-bold text-white light:text-slate-900 flex items-center gap-2 font-mono">
                <FileText className="w-5 h-5 text-red-500" />
                Voucher Details: {detailVoucher?.voucher_number || "Loading..."}
              </h2>
              <button
                onClick={() => setSelectedVoucherId(null)}
                className="p-1.5 rounded-full text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black hover:bg-slate-800 light:hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <Loader kind="voucher" label="Fetching voucher postings" />
            ) : detailVoucher ? (
              <div className="space-y-6 text-xs font-semibold">
                
                {/* Meta details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950 light:bg-slate-50 p-4 border border-slate-800 light:border-slate-200 rounded-2xl">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Date</p>
                    <p className="text-white light:text-slate-900 font-mono mt-0.5">{detailVoucher.voucher_date}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Reference #</p>
                    <p className="text-white light:text-slate-900 mt-0.5">{detailVoucher.reference || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Voucher Type</p>
                    <p className="text-white light:text-slate-900 uppercase mt-0.5 font-mono">{detailVoucher.voucher_type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Created At</p>
                    <p className="text-white light:text-slate-900 font-mono mt-0.5">{new Date(detailVoucher.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* Ledger Double-Entry postings */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-500">Ledger Double-Entry Postings</h4>
                  <div className="border border-slate-800 light:border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 light:border-slate-200 bg-slate-950 light:bg-slate-100 text-slate-400 light:text-slate-600 uppercase font-black tracking-wider text-[9px]">
                          <th className="py-2 px-4">Ledger Account</th>
                          <th className="py-2 px-4">Type</th>
                          <th className="py-2 px-4 text-right">Debit Amount ({company?.currency || "₹"})</th>
                          <th className="py-2 px-4 text-right">Credit Amount ({company?.currency || "₹"})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailVoucher.entries?.map((entry: any) => (
                          <tr key={entry.id} className="border-b border-slate-800/50 light:border-slate-100 text-slate-300 light:text-slate-700">
                            <td className="py-2 px-4 font-bold">{entry.ledger_name}</td>
                            <td className="py-2 px-4 uppercase text-[10px] text-slate-500">{entry.account_type}</td>
                            <td className="py-2 px-4 text-right font-mono">
                              {Number(entry.debit_amount) > 0 ? `${company?.currency || "₹"}${Number(entry.debit_amount).toFixed(2)}` : ""}
                            </td>
                            <td className="py-2 px-4 text-right font-mono">
                              {Number(entry.credit_amount) > 0 ? `${company?.currency || "₹"}${Number(entry.credit_amount).toFixed(2)}` : ""}
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
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-500">Inventory Items Purchased</h4>
                    <div className="border border-slate-800 light:border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 light:border-slate-200 bg-slate-950 light:bg-slate-100 text-slate-400 light:text-slate-600 uppercase font-black tracking-wider text-[9px]">
                            <th className="py-2 px-4">Stock Item Name</th>
                            <th className="py-2 px-4">SKU</th>
                            <th className="py-2 px-4 text-right">Quantity</th>
                            <th className="py-2 px-4 text-right">Purchase Rate ({company?.currency || "₹"})</th>
                            <th className="py-2 px-4 text-right">Total Cost ({company?.currency || "₹"})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailVoucher.items.map((item: any) => (
                            <tr key={item.id} className="border-b border-slate-800/50 light:border-slate-100 text-slate-300 light:text-slate-700">
                              <td className="py-2 px-4 font-bold">{item.item_name}</td>
                              <td className="py-2 px-4 font-mono text-slate-500">{item.sku || "N/A"}</td>
                              <td className="py-2 px-4 text-right font-mono">{item.quantity}</td>
                              <td className="py-2 px-4 text-right font-mono">{company?.currency || "₹"}{Number(item.rate).toFixed(2)}</td>
                              <td className="py-2 px-4 text-right font-mono text-white light:text-slate-900">{company?.currency || "₹"}{Number(item.amount).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Narration */}
                {detailVoucher.narration && (
                  <div className="space-y-1.5 bg-slate-950 light:bg-slate-50 p-3.5 border border-slate-800 light:border-slate-200 rounded-2xl">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Narration / remarks</p>
                    <p className="text-slate-300 light:text-slate-700 italic mt-0.5">"{detailVoucher.narration}"</p>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-slate-800 light:border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSelectedVoucherId(null)}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition"
                  >
                    Close View
                  </button>
                </div>

              </div>
            ) : (
              <p className="text-center py-12 text-slate-400 light:text-slate-600 text-xs">Voucher details unavailable.</p>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification Container */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="p-4 rounded-2xl bg-slate-900/95 light:bg-white border border-slate-800 light:border-slate-200 text-xs font-semibold text-white light:text-slate-900 shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in-left pointer-events-auto"
          >
            <div className="p-1 bg-brand-red/15 border border-brand-red/30 text-brand-red rounded-lg shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
