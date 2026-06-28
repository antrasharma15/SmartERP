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

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  invoice_type: string;
  customer_name: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
}

export default function InvoicesListPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  // Data lists
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Detail modal overlay
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<any>(null);
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
    console.log("[InvoicesList] Verifying session...");
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
      fetchInvoices(activeCompany.id);
    } catch (err) {
      console.error("[InvoicesList Error] Parse active company failed:", err);
      localStorage.removeItem("activeCompany");
      router.push("/companies");
    }
  }, [router]);

  // Fetch invoices
  const fetchInvoices = async (companyId: string) => {
    setLoading(true);
    setError("");
    console.log(`[InvoicesList] Fetching historical invoices...`);
    try {
      const data = await apiFetch(`/invoices?company_id=${companyId}`);
      setInvoices(data.invoices || []);
      console.log(`[InvoicesList] Loaded ${data.invoices?.length} invoices.`);
    } catch (err: any) {
      console.error("[InvoicesList Error] Fetch failed:", err);
      setError(err.message || "Failed to load invoices register");
    } finally {
      setLoading(false);
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(i => {
    const query = searchQuery.toLowerCase().trim();
    return (
      i.invoice_number.toLowerCase().includes(query) ||
      i.customer_name.toLowerCase().includes(query) ||
      i.invoice_type.toLowerCase().includes(query) ||
      i.invoice_date.includes(query)
    );
  });

  // Fetch detail view
  const fetchInvoiceDetail = async (invoiceId: string) => {
    setDetailLoading(true);
    setDetailInvoice(null);
    console.log(`[InvoicesList] Fetching detail for ID: ${invoiceId}`);
    try {
      const data = await apiFetch(`/invoices/${invoiceId}`);
      setDetailInvoice(data.invoice);
    } catch (err: any) {
      console.error("[InvoicesList Error] Load details failed:", err);
      triggerToast(`Error loading details: ${err.message}`);
      setSelectedInvoiceId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedInvoiceId) {
      fetchInvoiceDetail(selectedInvoiceId);
    }
  }, [selectedInvoiceId]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTypingInInput = 
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "SELECT" || 
        document.activeElement?.tagName === "TEXTAREA";

      if (isTypingInInput && selectedInvoiceId) {
        if (e.key === "Escape") {
          e.preventDefault();
          setSelectedInvoiceId(null);
        }
        return;
      }

      // Escape
      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedInvoiceId) {
          setSelectedInvoiceId(null);
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

      // ALT + B (New Billing Invoice)
      if (e.altKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        router.push("/billing/create");
        return;
      }

      // Enter (View highlighted details)
      if (!selectedInvoiceId && !isTypingInInput && e.key === "Enter") {
        e.preventDefault();
        const selected = filteredInvoices[selectedRowIndex];
        if (selected) {
          setSelectedInvoiceId(selected.id);
        }
        return;
      }

      // Delete key (Void highlighted invoice)
      if (!selectedInvoiceId && !isTypingInInput && e.key === "Delete") {
        e.preventDefault();
        const selected = filteredInvoices[selectedRowIndex];
        if (selected) {
          handleDeleteInvoice(selected.id, selected.invoice_number);
        }
        return;
      }

      // Arrow navigation
      if (!selectedInvoiceId && !isTypingInInput && filteredInvoices.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedRowIndex(prev => (prev + 1) % filteredInvoices.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedRowIndex(prev => (prev - 1 + filteredVouchers.length) % filteredInvoices.length); // wait, typo in filteredVouchers
        }
      }
    };

    const filteredVouchers = filteredInvoices; // safety fallback for typo in previous block

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedInvoiceId, filteredInvoices, selectedRowIndex, router]);

  // Delete/Void invoice
  const handleDeleteInvoice = async (invoiceId: string, invoiceNum: string) => {
    if (!confirm(`Are you sure you want to void and delete invoice "${invoiceNum}"? This will reverse all ledger entries and stock quantities!`)) {
      return;
    }

    console.log(`[InvoicesList] Voiding and deleting invoice: ${invoiceId}`);
    try {
      const response = await apiFetch(`/invoices/${invoiceId}`, {
        method: "DELETE"
      });
      console.log("[InvoicesList] Deletion success:", response);
      triggerToast(`Invoice ${invoiceNum} deleted and stock levels rolled back.`);
      fetchInvoices(company.id);
    } catch (err: any) {
      console.error("[InvoicesList Error] Deletion failed:", err);
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
        {/* Left Column: Invoices list - 9 span */}
        <section className="lg:col-span-9 rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-6 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-brand-lime" />
                Invoices & Billing Register
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                View audit trails of printed billing documents, customer tax invoices, and payment statuses.
              </p>
            </div>

            <button
              onClick={() => router.push("/billing/create")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-brand-navy-dark bg-brand-lime hover:bg-white transition duration-200 text-xs shadow-lg shadow-brand-lime/10"
            >
              <Plus className="w-4 h-4" />
              New Invoice (Alt+B)
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search invoice number, customer name or date... (Press Ctrl+F to focus)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedRowIndex(0);
              }}
              className="w-full pl-11 pr-4 py-3 bg-brand-navy-dark/60 border border-slate-850 rounded-2xl text-slate-200 placeholder-slate-500 outline-none focus:border-brand-lime transition text-xs font-semibold"
            />
          </div>

          {/* Invoices Table */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-lime" />
              <p className="text-xs font-medium">Fetching billing records...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-slate-300 text-sm">{error}</p>
              <button
                onClick={() => fetchInvoices(company.id)}
                className="px-5 py-2 bg-brand-navy-light/40 border border-slate-800 rounded-xl hover:text-white text-xs font-bold"
              >
                Retry Query
              </button>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-24 border border-dashed border-slate-800 rounded-3xl text-center">
              <p className="text-slate-400 text-xs">No invoices match search filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-900/50 rounded-2xl bg-brand-navy-dark/20">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">GST ($)</th>
                    <th className="py-3 px-4 text-right">Grand Total ($)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice, idx) => {
                    const isSelected = selectedRowIndex === idx;
                    const dateObj = new Date(invoice.invoice_date);
                    const localDateStr = isNaN(dateObj.getTime()) ? invoice.invoice_date : dateObj.toISOString().split("T")[0];
                    return (
                      <tr
                        key={invoice.id}
                        onClick={() => setSelectedRowIndex(idx)}
                        onDoubleClick={() => setSelectedInvoiceId(invoice.id)}
                        className={`border-b border-slate-900/40 transition duration-150 cursor-pointer ${
                          isSelected
                            ? "bg-brand-lime/10 text-brand-lime font-bold border-l-4 border-l-brand-lime"
                            : "text-slate-300 hover:bg-slate-900/30"
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold">
                          <span className="flex items-center gap-1.5">
                            {isSelected && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                            {invoice.invoice_number}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">{localDateStr}</td>
                        <td className="py-3 px-4 text-slate-300 font-semibold">{invoice.customer_name}</td>
                        <td className="py-3 px-4 uppercase font-mono font-black text-[10px] text-slate-500">
                          {invoice.invoice_type}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          ${Number(invoice.tax_amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-white">
                          ${Number(invoice.total_amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInvoiceId(invoice.id);
                              }}
                              className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                              title="View Invoice Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteInvoice(invoice.id, invoice.invoice_number);
                              }}
                              className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400"
                              title="Delete / Void Invoice"
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
            <span>ALT+B = Create Invoice | ESC = Dashboard</span>
          </div>
        </section>

        {/* Right Column: Sidebar Stats - 3 span */}
        <section className="lg:col-span-3 space-y-6">
          <div className="rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-5 shadow-2xl backdrop-blur-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-lime flex items-center gap-1.5 border-b border-slate-900 pb-2">
              Billing Ledger
            </h3>
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-900/40">
                <span className="text-slate-400">Total Invoices</span>
                <span className="font-bold text-white font-mono">{invoices.length}</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                Approved GST invoices post dynamic inventory transaction out-flows and recognize double-entry ledger earnings.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Invoice Detail Modal Overlay */}
      {selectedInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-brand-navy-dark border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 font-mono">
                <FileText className="w-5 h-5 text-brand-lime" />
                Invoice: {detailInvoice?.invoice_number || "Loading..."}
              </h2>
              <button
                onClick={() => setSelectedInvoiceId(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-brand-lime" />
                <p className="text-xs">Fetching items...</p>
              </div>
            ) : detailInvoice ? (
              <div className="space-y-6 text-xs font-semibold">
                
                {/* Meta details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/20 p-4 border border-slate-900 rounded-2xl">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Customer Name</p>
                    <p className="text-white mt-0.5">{detailInvoice.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black">GSTIN</p>
                    <p className="text-white font-mono mt-0.5">{detailInvoice.gst_number || "UNREGISTERED"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Invoice Date</p>
                    <p className="text-white font-mono mt-0.5">
                      {new Date(detailInvoice.invoice_date).toISOString().split("T")[0]}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Billing Type</p>
                    <p className="text-white uppercase mt-0.5 font-mono">{detailInvoice.invoice_type}</p>
                  </div>
                </div>

                {/* Invoice items listing */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-brand-lime">Line Items Detail</h4>
                  <div className="border border-slate-900 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 uppercase font-black tracking-wider text-[9px]">
                          <th className="py-2 px-4">Stock Item Name</th>
                          <th className="py-2 px-4">SKU</th>
                          <th className="py-2 px-4 text-right">Quantity</th>
                          <th className="py-2 px-4 text-right">Unit Rate ($)</th>
                          <th className="py-2 px-4 text-right">GST%</th>
                          <th className="py-2 px-4 text-right">Subtotal ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailInvoice.items?.map((item: any) => (
                          <tr key={item.id} className="border-b border-slate-900/40 text-slate-300">
                            <td className="py-2 px-4 font-bold">{item.item_name}</td>
                            <td className="py-2 px-4 font-mono text-slate-500">{item.sku || "N/A"}</td>
                            <td className="py-2 px-4 text-right font-mono">{item.quantity}</td>
                            <td className="py-2 px-4 text-right font-mono">${Number(item.rate).toFixed(2)}</td>
                            <td className="py-2 px-4 text-right font-mono text-slate-400">{item.gst_percentage}%</td>
                            <td className="py-2 px-4 text-right font-mono text-white">${Number(item.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ledger Double-Entry postings */}
                {detailInvoice.entries && detailInvoice.entries.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-brand-lime">Accounting Ledgers Postings</h4>
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
                          {detailInvoice.entries.map((entry: any) => (
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
                )}

                <div className="flex justify-between items-center bg-slate-950/20 p-4 border border-slate-900 rounded-2xl">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-black">Narration:</span>
                    <p className="text-slate-400 italic mt-0.5">"Sales invoice posted via Billing engine"</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-black">Invoice Grand Total</span>
                    <p className="text-white text-base font-black font-mono mt-0.5">${Number(detailInvoice.total_amount).toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-900">
                  <button
                    type="button"
                    onClick={() => setSelectedInvoiceId(null)}
                    className="px-6 py-2.5 bg-brand-lime text-brand-navy-dark hover:bg-white font-bold rounded-xl transition"
                  >
                    Close View
                  </button>
                </div>

              </div>
            ) : (
              <p className="text-center py-12 text-slate-400 text-xs">Invoice details unavailable.</p>
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
