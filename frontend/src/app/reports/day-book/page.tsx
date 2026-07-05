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
  X,
  FileCode,
  Filter,
  Search,
  BookOpen
} from "lucide-react";

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
  const [currency, setCurrency] = useState("$");

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
          setCurrency(comp.currency || "$");
          setCompany(comp);
        } catch (e) {}
      }
    };
    updateCurrency();
    window.addEventListener("activeCompanyChanged", updateCurrency);
    return () => window.removeEventListener("activeCompanyChanged", updateCurrency);
  }, []);

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
      setCurrency(activeCompany.currency || "$");
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

  // Totals calculations
  const filtered = getFilteredVouchers();
  const totalDebit = filtered.reduce((sum, v) => sum + getDebitCredit(v).debit, 0);
  const totalCredit = filtered.reduce((sum, v) => sum + getDebitCredit(v).credit, 0);

  return (
    <div className="min-h-screen bg-brand-navy-dark text-slate-100 flex flex-col select-none relative overflow-hidden font-sans">
      {/* Header bar */}
      <header className="border-b border-brand-navy-light bg-brand-navy-dark/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-xl bg-slate-900 light:bg-slate-200/80 border border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-brand-lime light:text-lime-700 hover:border-brand-lime/40 transition duration-200"
              title="Return to Dashboard (ESC)"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/dashboard")}>
              <span className="text-xl font-extrabold text-white light:text-slate-900 tracking-wide">KEY</span>
              <span className="px-2 py-0.5 text-xs font-extrabold bg-brand-lime text-brand-navy-dark rounded font-mono">books</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-800"></div>
            <div className="flex items-center gap-2 text-brand-lime light:text-lime-700 font-bold">
              <Building2 className="w-5 h-5" />
              <span>{company?.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-xs font-mono bg-slate-900 light:bg-slate-200/80 border border-slate-800 light:border-slate-200 px-3 py-1 rounded text-slate-400 light:text-slate-600">
              Esc to Back
            </span>
          </div>
        </div>
      </header>

      {/* Filters Toolbar */}
      <section className="bg-brand-navy-mid light:bg-slate-100 border-b border-slate-900 light:border-slate-200/60 light:border-slate-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Range picker */}
            <div className="flex items-center gap-2 bg-slate-900 light:bg-slate-200/80/40 light:bg-slate-100 border border-slate-800 light:border-slate-200 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-slate-400 light:text-slate-600" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-white light:text-slate-900 outline-none font-mono"
              />
              <span className="text-slate-500 light:text-slate-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-white light:text-slate-900 outline-none font-mono"
              />
              <button
                onClick={handleDateChange}
                className="ml-2 px-2.5 py-1 bg-brand-lime hover:bg-white text-brand-navy-dark rounded-lg text-[10px] font-black transition uppercase"
              >
                Fetch
              </button>
            </div>

            {/* Voucher Type filter */}
            <div className="flex items-center gap-2 bg-slate-900 light:bg-slate-200/80/40 light:bg-slate-100 border border-slate-800 light:border-slate-200 rounded-xl px-3 py-2">
              <Filter className="w-4 h-4 text-slate-400 light:text-slate-600" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-white light:text-slate-900 outline-none cursor-pointer"
              >
                <option value="All" className="bg-slate-950 light:bg-slate-100 text-white light:text-slate-900">All Voucher Types</option>
                <option value="Payment" className="bg-slate-955 text-white light:text-slate-900">Payment</option>
                <option value="Receipt" className="bg-slate-955 text-white light:text-slate-900">Receipt</option>
                <option value="Sales" className="bg-slate-955 text-white light:text-slate-900">Sales</option>
                <option value="Purchase" className="bg-slate-955 text-white light:text-slate-900">Purchase</option>
              </select>
            </div>

            {/* Particulars search */}
            <div className="flex items-center gap-2 bg-slate-900 light:bg-slate-200/80/40 light:bg-slate-100 border border-slate-800 light:border-slate-200 rounded-xl px-3 py-1.5 w-60">
              <Search className="w-4 h-4 text-slate-400 light:text-slate-600" />
              <input
                type="text"
                placeholder="Search Particulars/Voucher No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-white light:text-slate-900 outline-none w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Tabs Navigation */}
      <div className="max-w-7xl mx-auto w-full px-6 pt-6">
        <div className="flex border-b border-slate-900 light:border-slate-200 gap-1 text-xs">
          <button
            onClick={() => setActiveTab("report")}
            className={`px-5 py-3 font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "report" ? "border-brand-lime text-brand-lime light:text-lime-700 font-black" : "border-transparent text-slate-400 light:text-slate-600 hover:text-white light:text-slate-900 light:hover:text-black"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Day Book Report View
          </button>
          <button
            onClick={() => setActiveTab("spec")}
            className={`ml-auto px-5 py-3 font-extrabold border-b-2 transition flex items-center gap-2 text-sky-400 border-transparent hover:text-white light:text-slate-900 light:hover:text-black`}
          >
            <FileCode className="w-4 h-4 text-sky-400" />
            Systems Architect Specification
          </button>
        </div>
      </div>

      {/* Main content grid */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Principal Table - 9 span */}
        <section className="lg:col-span-9 rounded-3xl bg-brand-navy-light/10 light:bg-white border border-slate-900 light:border-slate-200/60 light:border-slate-200 p-6 shadow-2xl backdrop-blur-xl space-y-6 min-h-[500px]">
          
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center gap-3 text-slate-400 light:text-slate-600">
              <Loader2 className="w-8 h-8 animate-spin text-brand-lime light:text-lime-700" />
              <p className="text-xs">Consolidating vouchers from transactional history...</p>
            </div>
          ) : error ? (
            <div className="py-24 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
              <p className="text-sm text-slate-355">{error}</p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {activeTab === "report" && (
                <div className="space-y-4">
                  {filtered.length === 0 ? (
                    <div className="py-24 border border-dashed border-slate-800 light:border-slate-200 rounded-3xl text-center">
                      <p className="text-slate-400 light:text-slate-600 text-xs">No vouchers match the active filter criteria.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-slate-900 light:border-slate-200/50 light:border-slate-200 rounded-2xl bg-brand-navy-dark/20 light:bg-white">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-900 light:border-slate-200 bg-slate-950 light:bg-slate-100/40 light:bg-slate-100 text-slate-400 light:text-slate-600 uppercase font-black tracking-wider text-[9px]">
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Voucher No</th>
                            <th className="py-3 px-4">Voucher Type</th>
                            <th className="py-3 px-4">Particulars (Opposite Ledger)</th>
                            <th className="py-3 px-4 text-right">Debit (Receipts/Sales)</th>
                            <th className="py-3 px-4 text-right">Credit (Payments/Purchases)</th>
                            <th className="py-3 px-4 text-center">Audit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((v) => {
                            const d = new Date(v.voucher_date);
                            const localDate = isNaN(d.getTime()) ? v.voucher_date : d.toISOString().split("T")[0];
                            const { debit, credit } = getDebitCredit(v);

                            return (
                              <tr key={v.voucher_id} className="border-b border-slate-900 light:border-slate-200/30 light:border-slate-150 hover:bg-slate-900 light:bg-slate-200/80/10 text-slate-300 light:text-slate-700">
                                <td className="py-3 px-4 font-mono">{localDate}</td>
                                <td className="py-3 px-4 font-mono font-bold text-white light:text-slate-900">{v.voucher_number}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                    v.voucher_type.toLowerCase() === "receipt"
                                      ? "bg-brand-lime/10 light:bg-lime-100/60 text-brand-lime light:text-lime-700"
                                      : v.voucher_type.toLowerCase() === "sales"
                                      ? "bg-emerald-500/10 text-emerald-400 light:text-emerald-700"
                                      : v.voucher_type.toLowerCase() === "payment"
                                      ? "bg-rose-500/10 light:bg-rose-100/60 text-rose-450 light:text-rose-700"
                                      : "bg-sky-500/10 text-sky-400"
                                  }`}>
                                    {v.voucher_type}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-bold">{v.party_name || "Multiple Ledger Splits"}</td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-slate-200 light:text-slate-800">
                                  {debit > 0 ? `${currency}${debit.toFixed(2)}` : "-"}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-slate-350">
                                  {credit > 0 ? `${currency}${credit.toFixed(2)}` : "-"}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button
                                    onClick={() => setSelectedVoucherId(v.voucher_id)}
                                    className="p-1 rounded bg-slate-900 light:bg-slate-200/80 border border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:text-slate-900 light:hover:text-black"
                                    title="View Double Entry Splits"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {/* Aggregate totals row */}
                          <tr className="bg-slate-950 light:bg-slate-100/60 font-black border-t border-slate-900 light:border-slate-200 text-slate-200 light:text-slate-800 uppercase tracking-wide">
                            <td className="py-4 px-4" colSpan={4}>Consolidated Day Book Total</td>
                            <td className="py-4 px-4 text-right font-mono text-emerald-400 light:text-emerald-700">{currency}{totalDebit.toFixed(2)}</td>
                            <td className="py-4 px-4 text-right font-mono text-white light:text-slate-900">{currency}{totalCredit.toFixed(2)}</td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Spec Document */}
              {activeTab === "spec" && (
                <div className="space-y-6 text-xs text-slate-300 light:text-slate-700 leading-relaxed font-semibold max-h-[700px] overflow-y-auto pr-2">
                  <div className="border-b border-slate-900 light:border-slate-200 pb-3">
                    <h3 className="text-base font-extrabold text-white light:text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-sky-400" />
                      Day Book Systems Architect Design Spec
                    </h3>
                    <p className="text-[10px] text-slate-500 light:text-slate-500 mt-0.5">Reference documentation for chronological transactional aggregation.</p>
                  </div>

                  {/* Architecture Point 1 */}
                  <div className="space-y-3 bg-slate-950 light:bg-slate-100/40 light:bg-slate-100 p-4 border border-slate-900 light:border-slate-200 rounded-2xl">
                    <h4 className="font-extrabold text-brand-lime light:text-lime-700 uppercase text-[10px] tracking-wider">1. Read-Only Transaction Aggregation</h4>
                    <p className="text-[11px] text-slate-400 light:text-slate-600">Day Book does not store transactions itself. It is a read-only consolidated ledger view that queries the existing `vouchers` and `voucher_entries` tables chronologically:</p>
                    <pre className="p-3 bg-slate-950 light:bg-slate-100 rounded-xl text-[10px] font-mono text-sky-300 overflow-x-auto">
{`vouchers (voucher_id, voucher_number, voucher_type, voucher_date, narration)
voucher_entries (entry_id, voucher_id, ledger_id, debit_amount, credit_amount)`}
                    </pre>
                  </div>

                  {/* Architecture Point 3 */}
                  <div className="space-y-3 bg-slate-950 light:bg-slate-100/40 light:bg-slate-100 p-4 border border-slate-900 light:border-slate-200 rounded-2xl">
                    <h4 className="font-extrabold text-brand-lime light:text-lime-700 uppercase text-[10px] tracking-wider">2. Consolidated Voucher Row Logic</h4>
                    <p className="text-[11px] text-slate-400 light:text-slate-600">Voucher entry structures can have multiple lines (debits and credits). The Day Book collapses them into a single summary line by extracting:</p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-400 light:text-slate-600 text-[11px]">
                      <li><strong className="text-white light:text-slate-900">Particulars (Opposite Ledger)</strong>: The name of the primary credit ledger for receipts/sales, or the primary debit ledger for payments/purchases.</li>
                      <li><strong className="text-white light:text-slate-900">Combined Voucher Amount</strong>: Calculated by taking the sum of credits (debits and credits must balance) for the voucher.</li>
                    </ul>
                  </div>

                  {/* REST API response */}
                  <div className="space-y-3 bg-slate-950 light:bg-slate-100/40 light:bg-slate-100 p-4 border border-slate-900 light:border-slate-200 rounded-2xl">
                    <h4 className="font-extrabold text-brand-lime light:text-lime-700 uppercase text-[10px] tracking-wider">3. REST API Output (JSON)</h4>
                    <pre className="p-3 bg-slate-950 light:bg-slate-100 rounded-xl text-[10px] font-mono text-sky-300 overflow-x-auto">
{`{
  "filters": {
    "start_date": "2026-07-04",
    "end_date": "2026-07-04",
    "voucher_type": "All"
  },
  "report": [
    {
      "voucher_id": "v76-cb92",
      "voucher_number": "Rcpt/001",
      "voucher_type": "Receipt",
      "voucher_date": "2026-07-04",
      "party_name": "Cash Sale",
      "total_amount": 5000.00
    },
    {
      "voucher_id": "v98-db15",
      "voucher_number": "Pay/001",
      "voucher_type": "Payment",
      "voucher_date": "2026-07-04",
      "party_name": "Office Supplies",
      "total_amount": 1200.00
    }
  ]
}`}
                    </pre>
                  </div>

                  {/* SQL query */}
                  <div className="space-y-3 bg-slate-950 light:bg-slate-100/40 light:bg-slate-100 p-4 border border-slate-900 light:border-slate-200 rounded-2xl">
                    <h4 className="font-extrabold text-brand-lime light:text-lime-700 uppercase text-[10px] tracking-wider">4. SQL Query JOIN Consolidator</h4>
                    <pre className="p-3 bg-slate-950 light:bg-slate-100 rounded-xl text-[10px] font-mono text-sky-300 overflow-x-auto">
{`SELECT 
    v.id as voucher_id,
    v.voucher_number,
    v.voucher_type,
    v.voucher_date,
    v.reference,
    v.narration,
    -- Extract the first credit ledger name as party particulars
    (SELECT l.name 
     FROM voucher_entries ve 
     JOIN ledgers l ON ve.ledger_id = l.id 
     WHERE ve.voucher_id = v.id AND ve.credit_amount > 0 
     LIMIT 1) as party_name,
    -- Sum voucher value
    COALESCE(SUM(ve.debit_amount), 0) as total_amount
FROM vouchers v
LEFT JOIN voucher_entries ve ON ve.voucher_id = v.id
WHERE v.company_id = 'YOUR_COMPANY_ID' 
  AND v.voucher_date BETWEEN '2026-04-01' AND '2027-03-31'
GROUP BY v.id, v.voucher_number, v.voucher_type, v.voucher_date, v.reference, v.narration
ORDER BY v.voucher_date DESC, v.created_at DESC;`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Column: Sidebar - 3 span */}
        <section className="lg:col-span-3 space-y-6">
          <div className="rounded-3xl bg-brand-navy-light/10 light:bg-white border border-slate-900 light:border-slate-200/60 light:border-slate-200 p-5 shadow-2xl backdrop-blur-xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-lime light:text-lime-700 flex items-center gap-1.5 border-b border-slate-900 light:border-slate-200 pb-2">
              Day Book Stats
            </h3>

            <div className="space-y-3 pt-1 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-900 light:border-slate-200/40 light:border-slate-200">
                <span className="text-slate-400 light:text-slate-600 font-bold">Vouchers Count</span>
                <span className="font-bold text-white light:text-slate-900 font-mono">{filtered.length} Vouchers</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900 light:border-slate-200/40 light:border-slate-200">
                <span className="text-slate-400 light:text-slate-600 font-bold">Total Inflows (Dr)</span>
                <span className="font-mono text-white light:text-slate-900 light:text-slate-900 font-bold">{currency}{totalDebit.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900 light:border-slate-200/40 light:border-slate-200">
                <span className="text-slate-400 light:text-slate-600 font-bold">Total Outflows (Cr)</span>
                <span className="font-mono text-white light:text-slate-900 light:text-slate-900 font-bold">{currency}{totalCredit.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-brand-navy-light/10 light:bg-white border border-slate-900 light:border-slate-200/60 light:border-slate-200 p-5 shadow-2xl backdrop-blur-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-white light:text-slate-900 flex items-center gap-1.5 border-b border-slate-900 light:border-slate-200 pb-2">
              Consolidation Rule
            </h3>
            <div className="pt-3 text-[10px] text-slate-450 light:text-slate-500 leading-relaxed space-y-2 font-bold">
              <p>Receipts & Sales represent business growth inflows (Debit).</p>
              <p>Payments & Purchases represent operational outflows (Credit).</p>
            </div>
          </div>
        </section>
      </main>

      {/* Drill-down Detail Modal Overlay */}
      {selectedVoucherId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl bg-brand-navy-dark border border-slate-800 light:border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-900 light:border-slate-200 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 font-mono">
                Voucher Drill-down: {voucherDetail?.voucher_number || "Loading..."}
              </h2>
              <button
                onClick={() => setSelectedVoucherId(null)}
                className="p-1 rounded-full text-slate-400 light:text-slate-600 hover:text-white light:text-slate-900 light:hover:text-black hover:bg-slate-900 light:bg-slate-200/80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 light:text-slate-600">
                <Loader2 className="w-8 h-8 animate-spin text-brand-lime light:text-lime-700" />
                <p className="text-xs">Loading ledger splits...</p>
              </div>
            ) : voucherDetail ? (
              <div className="space-y-6 text-xs font-semibold">
                
                {/* Meta details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950 light:bg-slate-100/20 light:bg-slate-100 p-4 border border-slate-900 light:border-slate-200 rounded-2xl">
                  <div>
                    <p className="text-[10px] text-slate-500 light:text-slate-500 uppercase font-black">Voucher Type</p>
                    <p className="text-white light:text-slate-900 uppercase mt-0.5 font-mono">{voucherDetail.voucher_type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 light:text-slate-500 uppercase font-black">Date</p>
                    <p className="text-white light:text-slate-900 font-mono mt-0.5">
                      {new Date(voucherDetail.voucher_date).toISOString().split("T")[0]}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 light:text-slate-500 uppercase font-black">Reference ID</p>
                    <p className="text-white light:text-slate-900 font-mono mt-0.5">{voucherDetail.reference || "None"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 light:text-slate-500 uppercase font-black">Narration</p>
                    <p className="text-slate-350 italic mt-0.5">{voucherDetail.narration || "No notes"}</p>
                  </div>
                </div>

                {/* Double Entry Ledger Splits */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-brand-lime light:text-lime-700">Accounting Ledger Splits</h4>
                  <div className="border border-slate-900 light:border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-900 light:border-slate-200 bg-slate-950 light:bg-slate-100/40 light:bg-slate-100 text-slate-400 light:text-slate-600 uppercase font-black tracking-wider text-[9px]">
                          <th className="py-2 px-4">Ledger Name</th>
                          <th className="py-2 px-4">Type</th>
                          <th className="py-2 px-4 text-right">Debit ({currency})</th>
                          <th className="py-2 px-4 text-right">Credit ({currency})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {voucherDetail.entries?.map((entry: any) => (
                          <tr key={entry.id} className="border-b border-slate-900 light:border-slate-200/40 light:border-slate-200 text-slate-300 light:text-slate-700">
                            <td className="py-2 px-4 font-bold">{entry.ledger_name}</td>
                            <td className="py-2 px-4 uppercase text-[10px] text-slate-500 light:text-slate-500">{entry.ledger_type}</td>
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

                {/* Itemized inventory rows */}
                {voucherDetail.items && voucherDetail.items.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-brand-lime light:text-lime-700">Inventory Movement Row Details</h4>
                    <div className="border border-slate-900 light:border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-900 light:border-slate-200 bg-slate-950 light:bg-slate-100/40 light:bg-slate-100 text-slate-400 light:text-slate-600 uppercase font-black tracking-wider text-[9px]">
                            <th className="py-2 px-4">Stock Name</th>
                            <th className="py-2 px-4">SKU</th>
                            <th className="py-2 px-4 text-right">Quantity</th>
                            <th className="py-2 px-4 text-right">Rate ({currency})</th>
                            <th className="py-2 px-4 text-right">Amount ({currency})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {voucherDetail.items.map((item: any) => (
                            <tr key={item.id} className="border-b border-slate-900 light:border-slate-200/40 light:border-slate-200 text-slate-300 light:text-slate-700">
                              <td className="py-2 px-4 font-bold">{item.item_name}</td>
                              <td className="py-2 px-4 font-mono text-slate-500 light:text-slate-500">{item.sku || "-"}</td>
                              <td className="py-2 px-4 text-right font-mono">{item.quantity}</td>
                              <td className="py-2 px-4 text-right font-mono">{currency}{Number(item.rate).toFixed(2)}</td>
                              <td className="py-2 px-4 text-right font-mono text-white light:text-slate-900">
                                {currency}{(Number(item.quantity) * Number(item.rate)).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-slate-900 light:border-slate-200">
                  <button
                    onClick={() => setSelectedVoucherId(null)}
                    className="px-6 py-2.5 bg-brand-lime text-brand-navy-dark hover:bg-white font-bold rounded-xl transition"
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
    </div>
  );
}
