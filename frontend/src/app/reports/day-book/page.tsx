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
  ClipboardList,
  Eye,
  X,
  FileCode,
  Filter,
  Search,
  BookOpen,
  Download
} from "lucide-react";
import { exportToCsv } from "../../utils/exportCsv";

interface VoucherRow {
  voucher_id: string;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  reference?: string;
  narration?: string;
  total_amount: number;
  party_name?: string;
}

type TabType = "report" | "spec";

export default function DayBookReportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [currency, setCurrency] = useState("₹");

  // Filter params
  const [startDate, setStartDate] = useState("2026-04-01");
  const [endDate, setEndDate] = useState("2027-03-31");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Report data
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("report");

  // Drill-down slide-over
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [voucherDetail, setVoucherDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Sync currency globally
  useEffect(() => {
    const updateCurrency = () => {
      const activeCompanyStr = localStorage.getItem("activeCompany");
      if (activeCompanyStr) {
        try {
          const comp = JSON.parse(activeCompanyStr);
          setCurrency(comp.currency || "₹");
          setCompany(comp);
        } catch (e) {}
      }
    };
    updateCurrency();
    window.addEventListener("activeCompanyChanged", updateCurrency);
    return () => window.removeEventListener("activeCompanyChanged", updateCurrency);
  }, []);

  // Listen for Escape key to return to dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const isTyping = 
          document.activeElement?.tagName === "INPUT" || 
          document.activeElement?.tagName === "SELECT" || 
          document.activeElement?.tagName === "TEXTAREA" ||
          document.activeElement?.getAttribute("contenteditable") === "true";
          
        if (isTyping) {
          (document.activeElement as HTMLElement).blur();
          return;
        }
        router.push("/dashboard");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  useEffect(() => {
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
      setCurrency(activeCompany.currency || "₹");
      fetchDayBook(activeCompany.id, startDate, endDate);
    } catch (err) {
      router.push("/companies");
    }
  }, [router]);

  const fetchDayBook = async (companyId: string, start: string, end: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/reports/day-book?company_id=${companyId}&start_date=${start}&end_date=${end}`);
      setVouchers(data.report || []);
    } catch (err: any) {
      setError(err.message || "Failed to load Day Book logs.");
    } finally {
      setLoading(false);
    }
  };

  const fetchVoucherDetail = async (voucherId: string) => {
    setDetailLoading(true);
    setVoucherDetail(null);
    try {
      const data = await apiFetch(`/vouchers/${voucherId}`);
      setVoucherDetail(data.voucher);
    } catch (err: any) {
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

  // Keyboard navigation back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedVoucherId) {
          setSelectedVoucherId(null);
        } else {
          router.push("/dashboard");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedVoucherId, router]);

  // Client-side aggregations and filters
  const getFilteredVouchers = () => {
    return vouchers.filter(v => {
      const matchType = typeFilter === "All" || v.voucher_type.toLowerCase() === typeFilter.toLowerCase();
      const matchSearch = searchQuery === "" || 
        v.voucher_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.narration || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.party_name || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  };

  // Compute Debit/Credit values based on voucher type
  // Receipts & Sales are debit movements (inflows/receivables)
  // Payments & Purchases are credit movements (outflows/payables)
  const getDebitCredit = (v: VoucherRow) => {
    const isDebit = ["receipt", "sales"].includes(v.voucher_type.toLowerCase());
    const amt = Number(v.total_amount) || 0;
    return {
      debit: isDebit ? amt : 0,
      credit: isDebit ? 0 : amt
    };
  };

  // Totals calculations & Pagination
  const filtered = getFilteredVouchers();
  const totalDebit = filtered.reduce((sum, v) => sum + getDebitCredit(v).debit, 0);
  const totalCredit = filtered.reduce((sum, v) => sum + getDebitCredit(v).credit, 0);

  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, startDate, endDate]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginatedRows = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleExportCsv = () => {
    const headers = [
      "Date",
      "Voucher No",
      "Voucher Type",
      "Particulars",
      `Debit (${currency})`,
      `Credit (${currency})`,
      "Narration"
    ];
    const rows = filtered.map((v) => {
      const d = new Date(v.voucher_date);
      const localDate = isNaN(d.getTime()) ? v.voucher_date : d.toISOString().split("T")[0];
      const { debit, credit } = getDebitCredit(v);
      return [
        localDate,
        v.voucher_number,
        v.voucher_type,
        v.party_name || "Multiple Ledger Splits",
        debit.toFixed(2),
        credit.toFixed(2),
        v.narration || ""
      ];
    });
    rows.push([
      "CONSOLIDATED TOTAL",
      "",
      "",
      "",
      totalDebit.toFixed(2),
      totalCredit.toFixed(2),
      ""
    ]);
    exportToCsv("Day_Book_Report", headers, rows);
  };

  return (
    <AppLayout
      pageTitle="Day Book Journal"
      pageSubtitle="Sequential chronology of daily accounting transactions and debit/credit postings."
    >
      <div className="space-y-6">
        {/* Filters Toolbar */}
        <div className="bg-slate-900/40 light:bg-white border border-slate-800 light:border-slate-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-sm font-semibold">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Range picker */}
            <div className="flex items-center gap-2 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3.5 py-2">
              <Calendar className="w-4 h-4 text-slate-400 light:text-slate-600" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-white light:text-slate-900 outline-none font-mono text-sm"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-white light:text-slate-900 outline-none font-mono text-sm"
              />
              <button
                onClick={handleDateChange}
                className="ml-2 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition uppercase"
              >
                Fetch
              </button>
            </div>

            {/* Voucher Type filter */}
            <div className="flex items-center gap-2 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3.5 py-2">
              <Filter className="w-4 h-4 text-slate-400 light:text-slate-600" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-white light:text-slate-900 outline-none cursor-pointer text-sm font-medium"
              >
                <option value="All">All Voucher Types</option>
                <option value="Payment">Payment</option>
                <option value="Receipt">Receipt</option>
                <option value="Sales">Sales</option>
                <option value="Purchase">Purchase</option>
              </select>
            </div>

            {/* Particulars search */}
            <div className="flex items-center gap-2 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3.5 py-2 w-72">
              <Search className="w-4 h-4 text-slate-400 light:text-slate-600" />
              <input
                type="text"
                placeholder="Search Particulars/Voucher No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-white light:text-slate-900 outline-none w-full text-sm font-medium"
              />
            </div>
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 light:bg-slate-100 hover:bg-slate-700 text-slate-200 light:text-slate-800 border border-slate-700 light:border-slate-300 font-bold rounded-xl text-sm shadow-sm transition"
            title="Export Day Book to CSV"
          >
            <Download className="w-4 h-4 text-red-500" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Main Tabs Navigation */}
        <div className="flex border-b border-slate-800 light:border-slate-200 gap-1 text-sm font-bold">
          <button
            onClick={() => setActiveTab("report")}
            className={`px-5 py-3 border-b-2 transition flex items-center gap-2 ${
              activeTab === "report" ? "border-red-600 text-red-500 font-extrabold" : "border-transparent text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Day Book Report View
          </button>
          <button
            onClick={() => setActiveTab("spec")}
            className={`ml-auto px-5 py-3 border-b-2 transition flex items-center gap-2 ${
              activeTab === "spec" ? "border-red-600 text-red-500 font-extrabold" : "border-transparent text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black"
            }`}
          >
            <FileCode className="w-4 h-4 text-sky-400" />
            Systems Architect Specification
          </button>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Principal Table - 9 span */}
          <section className="lg:col-span-9 rounded-3xl bg-slate-900/30 light:bg-white border border-slate-800 light:border-slate-200 p-6 shadow-xl backdrop-blur-xl space-y-6 min-h-[500px]">
            
            {loading ? (
              <Loader kind="voucher" label="Consolidating vouchers from transactional history" />
            ) : error ? (
              <div className="py-24 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <p className="text-base text-slate-300 light:text-slate-700">{error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeTab === "report" && (
                  <div className="space-y-4">
                    {filtered.length === 0 ? (
                      <div className="py-24 border border-dashed border-slate-800 light:border-slate-200 rounded-3xl text-center">
                        <p className="text-slate-400 light:text-slate-600 text-sm">No vouchers match the active filter criteria.</p>
                      </div>
                    ) : (
                      <>
                        <div className="overflow-hidden border border-slate-800 light:border-slate-200 rounded-2xl bg-slate-900/30 light:bg-white">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-slate-800 light:border-slate-200 bg-slate-950 light:bg-slate-100 text-slate-400 light:text-slate-600 uppercase font-black tracking-wider text-xs">
                                <th className="py-3.5 px-4">Date</th>
                                <th className="py-3.5 px-4">Voucher No</th>
                                <th className="py-3.5 px-4">Voucher Type</th>
                                <th className="py-3.5 px-4">Particulars (Opposite Ledger)</th>
                                <th className="py-3.5 px-4 text-right">Debit (Receipts/Sales)</th>
                                <th className="py-3.5 px-4 text-right">Credit (Payments/Purchases)</th>
                                <th className="py-3.5 px-4 text-center">Audit</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm">
                              {paginatedRows.map((v) => {
                                const d = new Date(v.voucher_date);
                                const localDate = isNaN(d.getTime()) ? v.voucher_date : d.toISOString().split("T")[0];
                                const { debit, credit } = getDebitCredit(v);

                                return (
                                  <tr key={v.voucher_id} className="border-b border-slate-800/50 light:border-slate-100 hover:bg-slate-800/40 light:hover:bg-slate-100/60 text-slate-300 light:text-slate-700 transition">
                                    <td className="py-3.5 px-4 font-mono font-medium">{localDate}</td>
                                    <td className="py-3.5 px-4 font-mono font-bold text-white light:text-slate-900">{v.voucher_number}</td>
                                    <td className="py-3.5 px-4">
                                      <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                                        v.voucher_type.toLowerCase() === "receipt"
                                          ? "bg-emerald-500/10 text-emerald-400 light:text-emerald-700"
                                          : v.voucher_type.toLowerCase() === "sales"
                                          ? "bg-red-500/10 text-red-400"
                                          : v.voucher_type.toLowerCase() === "payment"
                                          ? "bg-rose-500/10 text-rose-400"
                                          : "bg-sky-500/10 text-sky-400"
                                      }`}>
                                        {v.voucher_type}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-slate-200 light:text-slate-800">{v.party_name || "Multiple Ledger Splits"}</td>
                                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200 light:text-slate-800">
                                      {debit > 0 ? `${currency}${debit.toFixed(2)}` : "-"}
                                    </td>
                                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-400 light:text-slate-600">
                                      {credit > 0 ? `${currency}${credit.toFixed(2)}` : "-"}
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                      <button
                                        onClick={() => setSelectedVoucherId(v.voucher_id)}
                                        className="p-1.5 rounded-lg bg-slate-800 light:bg-slate-100 border border-slate-700 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black transition"
                                        title="View Double Entry Splits"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {/* Aggregate totals row */}
                              <tr className="bg-slate-950 light:bg-slate-100 font-bold border-t-2 border-slate-800 light:border-slate-300 text-white light:text-slate-900 uppercase tracking-wide text-sm">
                                <td className="py-4 px-4 font-black" colSpan={4}>Consolidated Day Book Total</td>
                                <td className="py-4 px-4 text-right font-mono font-black text-emerald-400 light:text-emerald-700">{currency}{totalDebit.toFixed(2)}</td>
                                <td className="py-4 px-4 text-right font-mono font-black text-red-400">{currency}{totalCredit.toFixed(2)}</td>
                                <td></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination Toolbar */}
                        {filtered.length > 0 && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-800 light:border-slate-200 text-xs">
                            <p className="text-slate-400 light:text-slate-600">
                              Showing <span className="font-bold text-white light:text-slate-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                              <span className="font-bold text-white light:text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> of{" "}
                              <span className="font-bold text-white light:text-slate-900">{filtered.length}</span> records
                            </p>

                            {totalPages > 1 && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                                      onClick={() => setCurrentPage(pageNum)}
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
                                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                  disabled={currentPage === totalPages}
                                  className="px-3 py-1.5 rounded-lg border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white text-slate-300 light:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 light:hover:bg-slate-100 font-semibold"
                                >
                                  Next
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Tab 2: Spec Documentation */}
                {activeTab === "spec" && (
                  <div className="space-y-6 text-xs text-slate-300 light:text-slate-700 leading-relaxed font-semibold max-h-[700px] overflow-y-auto pr-2">
                    <div className="border-b border-slate-800 light:border-slate-200 pb-3">
                      <h3 className="text-base font-extrabold text-white light:text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-sky-400" />
                        Day Book System Specification
                      </h3>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Right Column: Statistics - 3 span */}
          <section className="lg:col-span-3 space-y-6">
            <div className="rounded-3xl bg-slate-900/30 light:bg-white border border-slate-800 light:border-slate-200 p-5 shadow-xl backdrop-blur-xl space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-1.5 border-b border-slate-800 light:border-slate-200 pb-2">
                Day Book Totals
              </h3>

              <div className="space-y-3 pt-1 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-800/50 light:border-slate-100">
                  <span className="text-slate-400 light:text-slate-600 font-bold">Total Entries</span>
                  <span className="font-bold text-white light:text-slate-900">{filtered.length}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/50 light:border-slate-100">
                  <span className="text-slate-400 light:text-slate-600 font-bold">Total Inflows (Dr)</span>
                  <span className="font-mono text-emerald-400 light:text-emerald-700 font-bold">{currency}{totalDebit.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/50 light:border-slate-100">
                  <span className="text-slate-400 light:text-slate-600 font-bold">Total Outflows (Cr)</span>
                  <span className="font-mono text-red-400 font-bold">{currency}{totalCredit.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Drill-down double-entry details slide-over / Modal */}
      {selectedVoucherId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 light:border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-white light:text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-red-500" />
                Voucher Audit Details: {voucherDetail?.voucher_number || "Loading..."}
              </h3>
              <button
                onClick={() => setSelectedVoucherId(null)}
                className="p-1.5 rounded-full text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black hover:bg-slate-800 light:hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <Loader kind="voucher" label="Fetching double entry journal" />
            ) : voucherDetail ? (
              <div className="space-y-6 text-xs font-semibold">
                
                {/* Meta details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950 light:bg-slate-50 p-4 border border-slate-800 light:border-slate-200 rounded-2xl">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Voucher No</p>
                    <p className="text-white light:text-slate-900 font-mono mt-0.5">{voucherDetail.voucher_number}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Type</p>
                    <p className="text-white light:text-slate-900 uppercase font-mono mt-0.5">{voucherDetail.voucher_type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Date</p>
                    <p className="text-white light:text-slate-900 font-mono mt-0.5">{voucherDetail.voucher_date}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Reference</p>
                    <p className="text-white light:text-slate-900 mt-0.5">{voucherDetail.reference || "N/A"}</p>
                  </div>
                </div>

                {/* Double Entry Ledger Splits */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-red-500">Accounting Ledger Splits</h4>
                  <div className="border border-slate-800 light:border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 light:border-slate-200 bg-slate-950 light:bg-slate-100 text-slate-400 light:text-slate-600 uppercase font-black tracking-wider text-[9px]">
                          <th className="py-2 px-4">Ledger Name</th>
                          <th className="py-2 px-4">Type</th>
                          <th className="py-2 px-4 text-right">Debit ({currency})</th>
                          <th className="py-2 px-4 text-right">Credit ({currency})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {voucherDetail.entries?.map((entry: any) => (
                          <tr key={entry.id} className="border-b border-slate-800/50 light:border-slate-100 text-slate-300 light:text-slate-700">
                            <td className="py-2 px-4 font-bold">{entry.ledger_name}</td>
                            <td className="py-2 px-4 uppercase text-[10px] text-slate-500">{entry.ledger_type}</td>
                            <td className="py-2 px-4 text-right font-mono">
                              {Number(entry.debit_amount) > 0 ? `${currency}${Number(entry.debit_amount).toFixed(2)}` : ""}
                            </td>
                            <td className="py-2 px-4 text-right font-mono">
                              {Number(entry.credit_amount) > 0 ? `${currency}${Number(entry.credit_amount).toFixed(2)}` : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800 light:border-slate-200">
                  <button
                    onClick={() => setSelectedVoucherId(null)}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition"
                  >
                    Close View
                  </button>
                </div>

              </div>
            ) : (
              <p className="text-center py-12 text-slate-400 light:text-slate-600 text-xs">Voucher data unavailable.</p>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
