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
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ArrowLeft,
  X,
  Loader2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Users,
  DollarSign,
  ArrowRight,
  Download
} from "lucide-react";
import { exportToCsv } from "../utils/exportCsv";

interface Ledger {
  id: string;
  company_id: string;
  group_id: string | null;
  name: string;
  ledger_type: string;
  opening_balance: number;
  opening_balance_type: 'dr' | 'cr';
  group_name?: string;
  created_at: string;
  updated_at: string;
}

interface Group {
  id: string;
  company_id: string;
  name: string;
  type: string;
}

export default function LedgersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  // Data states
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Navigation states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    group_id: "",
    ledger_type: "Customer",
    opening_balance: 0,
    opening_balance_type: "dr" as "dr" | "cr"
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

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

  // Auth and company verification on mount
  useEffect(() => {
    console.log("[LedgersPage] Mounting component and checking auth session...");
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.warn("[LedgersPage Warning] No active session found. Redirecting to login.");
      router.push("/login");
      return;
    }
    setUser(currentUser);

    const activeCompanyStr = localStorage.getItem("activeCompany");
    if (!activeCompanyStr) {
      console.warn("[LedgersPage Warning] No active company selected. Redirecting to companies selection.");
      router.push("/companies");
      return;
    }

    try {
      const activeCompany = JSON.parse(activeCompanyStr);
      setCompany(activeCompany);
      console.log("[LedgersPage] Active company authenticated:", activeCompany.name);
      fetchData(activeCompany.id);
    } catch (err) {
      console.error("[LedgersPage Error] Failed to parse active company:", err);
      localStorage.removeItem("activeCompany");
      router.push("/companies");
    }
  }, [router]);

  // Fetch ledgers and groups from API
  const fetchData = async (companyId: string) => {
    setLoading(true);
    setError("");
    console.log(`[LedgersPage] Fetching data for company ID: ${companyId}`);
    try {
      const [ledgersData, groupsData] = await Promise.all([
        apiFetch(`/ledgers?company_id=${companyId}`),
        apiFetch(`/ledgers/groups?company_id=${companyId}`)
      ]);
      
      const ledgerList = ledgersData.ledgers || [];
      const groupList = groupsData.groups || [];
      
      setLedgers(ledgerList);
      setGroups(groupList);
      
      console.log(`[LedgersPage] Fetched ${ledgerList.length} ledgers and ${groupList.length} groups successfully.`);
    } catch (err: any) {
      console.error("[LedgersPage Error] Failed to fetch company data:", err);
      setError(err.message || "Failed to load ledger records");
    } finally {
      setLoading(false);
    }
  };

  // Filter ledgers based on query
  const filteredLedgers = ledgers.filter(ledger => {
    const term = searchQuery.toLowerCase();
    return (
      ledger.name.toLowerCase().includes(term) ||
      ledger.ledger_type.toLowerCase().includes(term) ||
      (ledger.group_name && ledger.group_name.toLowerCase().includes(term))
    );
  });

  // Pagination states
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when search query changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRowIndex(0);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredLedgers.length / ITEMS_PER_PAGE) || 1;
  const paginatedLedgers = filteredLedgers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Ensure index remains in bounds when list changes
  useEffect(() => {
    if (selectedRowIndex >= paginatedLedgers.length && paginatedLedgers.length > 0) {
      setSelectedRowIndex(paginatedLedgers.length - 1);
    }
  }, [paginatedLedgers.length, selectedRowIndex]);

  // Global keyboard shortcuts engine
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Skip custom bindings if user is actively filling form fields in the modal
      const isTypingInInput = 
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "SELECT" || 
        document.activeElement?.tagName === "TEXTAREA";

      if (isTypingInInput && isModalOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsModalOpen(false);
          setFormError("");
        }
        return;
      }

      // Block browser default shortcuts
      if (e.ctrlKey && ["f", "F", "c", "C", "s", "S", "l", "L", "a", "A"].includes(e.key)) {
        e.preventDefault();
      }
      if (e.altKey && ["l", "L", "a", "A"].includes(e.key)) {
        e.preventDefault();
      }

      // Handle Escape key globally
      if (e.key === "Escape") {
        e.preventDefault();
        if (isModalOpen) {
          console.log("[LedgersPage Keyboard] Escape pressed. Closing active modal.");
          setIsModalOpen(false);
          setFormError("");
        } else {
          console.log("[LedgersPage Keyboard] Escape pressed. Returning to dashboard.");
          router.push("/dashboard");
        }
        return;
      }

      // Handle ALT + L (Create Ledger)
      if (e.altKey && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        console.log("[LedgersPage Keyboard] ALT+L pressed. Opening Create Ledger form.");
        handleOpenCreateModal();
        return;
      }

      // Handle ALT + A or Enter (Alter Ledger)
      if ((e.altKey && (e.key === "a" || e.key === "A")) || (!isModalOpen && !isTypingInInput && e.key === "Enter")) {
        e.preventDefault();
        const selectedLedger = paginatedLedgers[selectedRowIndex];
        if (selectedLedger) {
          console.log(`[LedgersPage Keyboard] Alter shortcut triggered for: ${selectedLedger.name}`);
          handleOpenEditModal(selectedLedger);
        } else {
          triggerToast("No ledger selected to alter.");
        }
        return;
      }

      // Handle Delete Key
      if (!isModalOpen && !isTypingInInput && e.key === "Delete") {
        e.preventDefault();
        const selectedLedger = paginatedLedgers[selectedRowIndex];
        if (selectedLedger) {
          handleDeleteLedger(selectedLedger.id, selectedLedger.name);
        }
        return;
      }

      // Focus search shortcut (CTRL + F)
      if (e.ctrlKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Arrow navigation
      if (!isModalOpen && !isTypingInInput && paginatedLedgers.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedRowIndex(prev => (prev + 1) % paginatedLedgers.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedRowIndex(prev => (prev - 1 + paginatedLedgers.length) % paginatedLedgers.length);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, paginatedLedgers, selectedRowIndex, router]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode("create");
    setFormData({
      id: "",
      name: "",
      group_id: groups.length > 0 ? groups[0].id : "",
      ledger_type: "Customer",
      opening_balance: 0,
      opening_balance_type: "dr"
    });
    setFormError("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (ledger: Ledger) => {
    setModalMode("edit");
    setFormData({
      id: ledger.id,
      name: ledger.name,
      group_id: ledger.group_id || (groups.length > 0 ? groups[0].id : ""),
      ledger_type: ledger.ledger_type,
      opening_balance: Number(ledger.opening_balance),
      opening_balance_type: ledger.opening_balance_type
    });
    setFormError("");
    setIsModalOpen(true);
  };

  // Handle Form Submission (Create or Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    const { id, name, group_id, ledger_type, opening_balance, opening_balance_type } = formData;
    console.log(`[LedgersPage] Form submit requested. Mode: ${modalMode}, Payload:`, formData);

    if (!name.trim()) {
      setFormError("Ledger name is required");
      setFormLoading(false);
      return;
    }

    const payload = {
      company_id: company.id,
      name: name.trim(),
      group_id: group_id || null,
      ledger_type,
      opening_balance: Number(opening_balance) || 0,
      opening_balance_type
    };

    try {
      if (modalMode === "create") {
        const response = await apiFetch("/ledgers", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        console.log("[LedgersPage] Create ledger API success:", response.ledger);
        triggerToast(`Ledger "${name.trim()}" created successfully.`);
      } else {
        const response = await apiFetch(`/ledgers/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        console.log("[LedgersPage] Alter ledger API success:", response.ledger);
        triggerToast(`Ledger "${name.trim()}" updated successfully.`);
      }
      setIsModalOpen(false);
      fetchData(company.id);
    } catch (err: any) {
      console.error("[LedgersPage Error] API save transaction failed:", err);
      setFormError(err.message || "Operation failed. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Ledger
  const handleDeleteLedger = async (ledgerId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the ledger "${name}"? This action cannot be undone.`)) {
      return;
    }
    console.log(`[LedgersPage] Requesting deletion of ledger ID: ${ledgerId}`);
    try {
      const response = await apiFetch(`/ledgers/${ledgerId}`, {
        method: "DELETE"
      });
      console.log("[LedgersPage] Ledger deletion success:", response.ledger);
      triggerToast(`Ledger "${name}" deleted successfully.`);
      fetchData(company.id);
    } catch (err: any) {
      console.error("[LedgersPage Error] Deletion failed:", err);
      triggerToast(`Error: ${err.message || "Failed to delete ledger"}`);
    }
  };

  // Calculate statistics for the sidebar
  const getStats = () => {
    let customerCount = 0;
    let supplierCount = 0;
    let bankCount = 0;
    let cashCount = 0;
    let totalDebitBalance = 0;
    let totalCreditBalance = 0;

    ledgers.forEach(l => {
      const balance = Number(l.opening_balance) || 0;
      if (l.ledger_type === "Customer") customerCount++;
      else if (l.ledger_type === "Supplier") supplierCount++;
      else if (l.ledger_type === "Bank") bankCount++;
      else if (l.ledger_type === "Cash") cashCount++;

      if (l.opening_balance_type === "dr") {
        totalDebitBalance += balance;
      } else {
        totalCreditBalance += balance;
      }
    });

    return {
      customerCount,
      supplierCount,
      bankCount,
      cashCount,
      netDebitBalance: totalDebitBalance,
      netCreditBalance: totalCreditBalance
    };
  };

  const stats = getStats();

  const handleExportCsv = () => {
    const headers = [
      "Ledger Name",
      "Type",
      "Group Classification",
      "Opening Balance",
      "Balance Type"
    ];
    const rows = filteredLedgers.map(l => [
      l.name,
      l.ledger_type,
      l.group_name || "Uncategorized",
      Number(l.opening_balance).toFixed(2),
      l.opening_balance_type.toUpperCase()
    ]);
    exportToCsv("Ledgers_Directory_Report", headers, rows);
  };

  return (
    <AppLayout
      pageTitle="Ledger Accounts Management"
      pageSubtitle="Manage your asset, liability, customer, supplier, bank, and ledger accounts."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Ledger Management Grid - 9 span */}
        <section className="lg:col-span-8 xl:col-span-9 rounded-3xl bg-[#0b1528]/50 light:bg-white border border-slate-800/80 light:border-slate-200 p-6 shadow-xl backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 light:border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-white light:text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-red-500" />
                Ledger Directory
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-slate-200 light:text-slate-800 bg-slate-800 light:bg-slate-100 border border-slate-700 light:border-slate-300 hover:bg-slate-700 transition duration-200 text-sm shadow-sm"
                title="Export Ledgers to CSV"
              >
                <Download className="w-4 h-4 text-red-500" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition duration-200 text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create Ledger (Alt+L)
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search ledger name, type or group... (Press Ctrl+F to focus)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedRowIndex(0);
              }}
              className="w-full pl-11 pr-4 py-3 bg-slate-900/60 light:bg-white border border-slate-800 light:border-slate-300 rounded-2xl text-white light:text-slate-900 placeholder-slate-500 outline-none focus:border-red-500 transition text-sm font-semibold"
            />
          </div>

          {/* Ledger Table */}
          {loading ? (
            <Loader kind="ledger" label="Fetching accounts records" />
          ) : error ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-slate-300 light:text-slate-700 text-sm">{error}</p>
              <button
                onClick={() => fetchData(company.id)}
                className="px-5 py-2 bg-slate-800 light:bg-slate-100 border border-slate-700 light:border-slate-200 rounded-xl hover:text-white light:text-slate-900 light:hover:text-black text-sm font-bold"
              >
                Retry Request
              </button>
            </div>
          ) : filteredLedgers.length === 0 ? (
            <div className="py-24 border border-dashed border-slate-800 light:border-slate-200 rounded-3xl text-center space-y-4">
              <p className="text-slate-400 light:text-slate-600 text-sm">No ledger accounts match your search filters.</p>
              <button
                onClick={handleOpenCreateModal}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition"
              >
                Add First Ledger
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-800 light:border-slate-200 rounded-2xl bg-slate-900/30 light:bg-white">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 light:border-slate-200 bg-slate-950 light:bg-slate-100 text-slate-400 light:text-slate-600 uppercase font-black tracking-wider text-xs">
                    <th className="py-3.5 px-4">Ledger Name</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Group</th>
                    <th className="py-3.5 px-4 text-right">Opening Balance</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {paginatedLedgers.map((ledger, idx) => {
                    const isSelected = selectedRowIndex === idx;
                    return (
                      <tr
                        key={ledger.id}
                        onClick={() => setSelectedRowIndex(idx)}
                        onDoubleClick={() => handleOpenEditModal(ledger)}
                        className={`border-b border-slate-800/50 light:border-slate-100 transition duration-150 cursor-pointer ${
                          isSelected
                            ? "bg-red-500/10 light:bg-red-50 text-red-500 light:text-red-600 font-bold border-l-4 border-l-red-500"
                            : "text-slate-300 light:text-slate-700 hover:bg-slate-800/40 light:hover:bg-slate-100/60"
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-white light:text-slate-900">
                          <span className="flex items-center gap-1.5">
                            {isSelected && <ChevronRight className="w-4 h-4 shrink-0" />}
                            {ledger.name}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 bg-slate-800 light:bg-slate-100 border border-slate-700 light:border-slate-200 rounded-md text-xs text-sky-400 font-bold">
                            {ledger.ledger_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 light:text-slate-600 font-medium">
                          {ledger.group_name || "Uncategorized"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          {Number(ledger.opening_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          <span className="text-xs text-slate-500 light:text-slate-500 uppercase ml-1 font-bold">
                            {ledger.opening_balance_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(ledger);
                              }}
                              className="p-1.5 rounded bg-slate-800 light:bg-slate-100 border border-slate-700 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black"
                              title="Alter (Alt+A)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLedger(ledger.id, ledger.name);
                              }}
                              className="p-1.5 rounded bg-slate-800 light:bg-slate-100 border border-slate-700 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-red-400"
                              title="Delete (Delete)"
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

          {/* Pagination Toolbar */}
          {filteredLedgers.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-800 light:border-slate-200 text-xs">
              <p className="text-slate-400 light:text-slate-600">
                Showing <span className="font-bold text-white light:text-slate-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                <span className="font-bold text-white light:text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredLedgers.length)}</span> of{" "}
                <span className="font-bold text-white light:text-slate-900">{filteredLedgers.length}</span> ledgers
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
            <span>Use ↑↓ keys to select, Enter to edit</span>
            <span>ALT+L = Create | ALT+A = Alter | Delete = Remove | ESC = Exit</span>
          </div>
        </section>

        {/* Right Column: Sidebar Stats & Legend - 3 span */}
        <section className="lg:col-span-4 xl:col-span-3 space-y-6">
          {/* Quick Statistics */}
          <div className="rounded-3xl bg-[#0b1528]/50 light:bg-white border border-slate-800/80 light:border-slate-200 p-5 shadow-xl backdrop-blur-xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-red flex items-center gap-1.5 border-b border-slate-800 light:border-slate-200 pb-2">
              <TrendingUp className="w-4 h-4" />
              Accounts Summary
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50 light:border-slate-100">
                <span className="text-slate-400 light:text-slate-600">Total Ledgers</span>
                <span className="font-bold text-white light:text-slate-900 font-mono">{ledgers.length}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50 light:border-slate-100">
                <span className="text-slate-400 light:text-slate-600">Customers</span>
                <span className="font-bold text-sky-400 font-mono">{stats.customerCount}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50 light:border-slate-100">
                <span className="text-slate-400 light:text-slate-600">Suppliers</span>
                <span className="font-bold text-purple-400 font-mono">{stats.supplierCount}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50 light:border-slate-100">
                <span className="text-slate-400 light:text-slate-600">Bank Accounts</span>
                <span className="font-bold text-emerald-400 font-mono">{stats.bankCount}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50 light:border-slate-100">
                <span className="text-slate-400 light:text-slate-600">Cash Registers</span>
                <span className="font-bold text-amber-400 font-mono">{stats.cashCount}</span>
              </div>
            </div>

            {/* Trial balances preview */}
            <div className="pt-2 border-t border-slate-800 light:border-slate-200 space-y-2">
              <div>
                <p className="text-[10px] text-slate-500 light:text-slate-500 uppercase font-black">Total Debit Balances</p>
                <p className="text-base font-black text-emerald-400 font-mono">
                  {company?.currency || "₹"}{stats.netDebitBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 light:text-slate-500 uppercase font-black">Total Credit Balances</p>
                <p className="text-base font-black text-sky-400 font-mono">
                  {company?.currency || "₹"}{stats.netCreditBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Help Drawer */}
          <div className="rounded-3xl bg-[#0b1528]/50 light:bg-white border border-slate-800/80 light:border-slate-200 p-5 shadow-xl backdrop-blur-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-white light:text-slate-900 flex items-center gap-1.5 border-b border-slate-800 light:border-slate-200 pb-2">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              Keyboard Help
            </h3>
            <div className="space-y-2.5 pt-3 text-[10px] font-mono text-slate-400 light:text-slate-600">
              <div className="flex justify-between items-center">
                <span>Create Modal</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-brand-red font-bold rounded">Alt + L</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Alter Modal</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-white light:text-slate-900 rounded">Alt + A / Enter</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Delete selected</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-white light:text-slate-900 rounded">Delete</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Focus search</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-white light:text-slate-900 rounded">Ctrl + F</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Navigate rows</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-white light:text-slate-900 rounded">↑ / ↓</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Dashboard</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-white light:text-slate-900 rounded">ESC</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Form Modal (Create / Alter) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 light:border-slate-200 pb-3">
              <h2 className="text-xl font-bold text-white light:text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-red-500" />
                {modalMode === "create" ? "Create Ledger Account" : "Alter Ledger Account"}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setFormError("");
                }}
                className="p-1.5 rounded-full text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black hover:bg-slate-800 light:hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-semibold">
              {/* Ledger Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Ledger Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition"
                  placeholder="e.g. Rent Account, Acme Corp"
                />
              </div>

              {/* Group */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Under Group</label>
                <select
                  value={formData.group_id}
                  onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition cursor-pointer"
                >
                  <option value="" disabled>Select parent group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ledger Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Ledger Type</label>
                <select
                  value={formData.ledger_type}
                  onChange={(e) => setFormData({ ...formData, ledger_type: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition cursor-pointer"
                >
                  {["Customer", "Supplier", "Expense", "Income", "Bank", "Cash"].map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Opening Balance */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Opening Balance ({company?.currency || "₹"})</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={formData.opening_balance === 0 ? "" : formData.opening_balance}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d*\.?\d*$/.test(val)) {
                        setFormData({ ...formData, opening_balance: val as any });
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Dr / Cr</label>
                  <select
                    value={formData.opening_balance_type}
                    onChange={(e) => setFormData({ ...formData, opening_balance_type: e.target.value as "dr" | "cr" })}
                    className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition cursor-pointer font-bold"
                  >
                    <option value="dr">Debit (DR)</option>
                    <option value="cr">Credit (CR)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3.5 border-t border-slate-800 light:border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormError("");
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-800 transition"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Ledger"
                  )}
                </button>
              </div>
            </form>
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
