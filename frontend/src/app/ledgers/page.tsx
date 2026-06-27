"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getCurrentUser } from "../utils/api";
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
  ArrowRight
} from "lucide-react";

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

  // Ensure index remains in bounds when list changes
  useEffect(() => {
    if (selectedRowIndex >= filteredLedgers.length && filteredLedgers.length > 0) {
      setSelectedRowIndex(filteredLedgers.length - 1);
    }
  }, [filteredLedgers.length, selectedRowIndex]);

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
        const selectedLedger = filteredLedgers[selectedRowIndex];
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
        const selectedLedger = filteredLedgers[selectedRowIndex];
        if (selectedLedger) {
          console.log(`[LedgersPage Keyboard] Delete shortcut triggered for: ${selectedLedger.name}`);
          handleDeleteLedger(selectedLedger.id, selectedLedger.name);
        }
        return;
      }

      // Focus Search (Ctrl + F)
      if (e.ctrlKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        console.log("[LedgersPage Keyboard] CTRL+F pressed. Focusing search bar.");
        searchInputRef.current?.focus();
        return;
      }

      // Table Arrow Key Navigation
      if (!isModalOpen && !isTypingInInput) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedRowIndex(prev => (prev + 1) % filteredLedgers.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedRowIndex(prev => (prev - 1 + filteredLedgers.length) % filteredLedgers.length);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, filteredLedgers, selectedRowIndex, router]);

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
            <div className="hidden lg:flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Financial Year Period</span>
            </div>
            <span className="text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1 rounded text-slate-400">
              Esc to Back
            </span>
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="flex-1 max-w-[1400px] mx-auto px-6 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Ledger Management Grid - 9 span */}
        <section className="lg:col-span-9 rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-6 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-brand-lime" />
                Ledger Accounts Management
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Manage your asset, liability, customer, supplier, bank, and ledger accounts.
              </p>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-brand-navy-dark bg-brand-lime hover:bg-white transition duration-200 text-xs shadow-lg shadow-brand-lime/10"
            >
              <Plus className="w-4 h-4" />
              Create Ledger (Alt+L)
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search ledger name, type or group... (Press Ctrl+F to focus)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedRowIndex(0);
              }}
              className="w-full pl-11 pr-4 py-3 bg-brand-navy-dark/60 border border-slate-850 rounded-2xl text-slate-200 placeholder-slate-500 outline-none focus:border-brand-lime transition text-xs font-semibold"
            />
          </div>

          {/* Ledger Table */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-lime" />
              <p className="text-xs font-medium">Fetching accounts records...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-slate-300 text-sm">{error}</p>
              <button
                onClick={() => fetchData(company.id)}
                className="px-5 py-2 bg-brand-navy-light/40 border border-slate-800 rounded-xl hover:text-white text-xs font-bold"
              >
                Retry Request
              </button>
            </div>
          ) : filteredLedgers.length === 0 ? (
            <div className="py-24 border border-dashed border-slate-800 rounded-3xl text-center space-y-4">
              <p className="text-slate-400 text-xs">No ledger accounts match your search filters.</p>
              <button
                onClick={handleOpenCreateModal}
                className="px-5 py-2 bg-brand-lime text-brand-navy-dark hover:bg-white font-bold rounded-xl text-xs transition"
              >
                Add First Ledger
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-900/50 rounded-2xl bg-brand-navy-dark/20">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                    <th className="py-3 px-4">Ledger Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Group</th>
                    <th className="py-3 px-4 text-right">Opening Balance</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedgers.map((ledger, idx) => {
                    const isSelected = selectedRowIndex === idx;
                    return (
                      <tr
                        key={ledger.id}
                        onClick={() => setSelectedRowIndex(idx)}
                        onDoubleClick={() => handleOpenEditModal(ledger)}
                        className={`border-b border-slate-900/40 transition duration-150 cursor-pointer ${
                          isSelected
                            ? "bg-brand-lime/10 text-brand-lime font-bold border-l-4 border-l-brand-lime"
                            : "text-slate-300 hover:bg-slate-900/30"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1.5">
                            {isSelected && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                            {ledger.name}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-slate-900 border border-slate-850 rounded-md text-[10px] text-sky-400 font-semibold">
                            {ledger.ledger_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {ledger.group_name || "Uncategorized"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {Number(ledger.opening_balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          <span className="text-[10px] text-slate-500 uppercase ml-1">
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
                              className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                              title="Alter (Alt+A)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLedger(ledger.id, ledger.name);
                              }}
                              className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400"
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

          {/* Guide Legend */}
          <div className="flex justify-between items-center bg-slate-950/20 border border-slate-900/60 p-3 rounded-2xl text-[10px] text-slate-400 font-mono">
            <span>Use ↑↓ keys to select, Enter to edit</span>
            <span>ALT+L = Create | ALT+A = Alter | Delete = Remove | ESC = Exit</span>
          </div>
        </section>

        {/* Right Column: Sidebar Stats & Legend - 3 span */}
        <section className="lg:col-span-3 space-y-6">
          {/* Quick Statistics */}
          <div className="rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-5 shadow-2xl backdrop-blur-xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-lime flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <TrendingUp className="w-4 h-4" />
              Accounts Summary
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-900/40">
                <span className="text-slate-400">Total Ledgers</span>
                <span className="font-bold text-white font-mono">{ledgers.length}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900/40">
                <span className="text-slate-400">Customers</span>
                <span className="font-bold text-sky-400 font-mono">{stats.customerCount}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900/40">
                <span className="text-slate-400">Suppliers</span>
                <span className="font-bold text-purple-400 font-mono">{stats.supplierCount}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900/40">
                <span className="text-slate-400">Bank Accounts</span>
                <span className="font-bold text-emerald-400 font-mono">{stats.bankCount}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900/40">
                <span className="text-slate-400">Cash Registers</span>
                <span className="font-bold text-amber-400 font-mono">{stats.cashCount}</span>
              </div>
            </div>

            {/* Trial balances preview */}
            <div className="pt-2 border-t border-slate-900/60 space-y-2">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-black">Total Debit Balances</p>
                <p className="text-base font-black text-brand-lime font-mono">
                  ${stats.netDebitBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-black">Total Credit Balances</p>
                <p className="text-base font-black text-sky-400 font-mono">
                  ${stats.netCreditBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Help Drawer */}
          <div className="rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-5 shadow-2xl backdrop-blur-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              Keyboard Help
            </h3>
            <div className="space-y-2.5 pt-3 text-[10px] font-mono text-slate-400">
              <div className="flex justify-between items-center">
                <span>Create Modal</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-brand-lime rounded">Alt + L</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Alter Modal</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-white rounded">Alt + A / Enter</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Delete selected</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-white rounded">Delete</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Focus search</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-white rounded">Ctrl + F</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Navigate rows</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-white rounded">↑ / ↓</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Dashboard</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-white rounded">ESC</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Form Modal (Create / Alter) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-brand-navy-dark border border-slate-800 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-lime" />
                {modalMode === "create" ? "Create Ledger Account" : "Alter Ledger Account"}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setFormError("");
                }}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-900"
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
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ledger Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime transition"
                  placeholder="e.g. Rent Account, Acme Corp"
                />
              </div>

              {/* Group */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Under Group</label>
                <select
                  value={formData.group_id}
                  onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime transition cursor-pointer"
                >
                  <option value="" disabled className="bg-brand-navy-dark text-slate-400">Select parent group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id} className="bg-brand-navy-dark text-white">
                      {group.name} ({group.type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ledger Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ledger Type</label>
                <select
                  value={formData.ledger_type}
                  onChange={(e) => setFormData({ ...formData, ledger_type: e.target.value })}
                  className="w-full px-4 py-2.5 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime transition cursor-pointer"
                >
                  {["Customer", "Supplier", "Expense", "Income", "Bank", "Cash"].map((type) => (
                    <option key={type} value={type} className="bg-brand-navy-dark text-white">
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Opening Balance */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Opening Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime transition font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dr / Cr</label>
                  <select
                    value={formData.opening_balance_type}
                    onChange={(e) => setFormData({ ...formData, opening_balance_type: e.target.value as "dr" | "cr" })}
                    className="w-full px-4 py-2.5 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime transition cursor-pointer font-bold"
                  >
                    <option value="dr" className="bg-brand-navy-dark">Debit (DR)</option>
                    <option value="cr" className="bg-brand-navy-dark">Credit (CR)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3.5 border-t border-slate-900 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormError("");
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-brand-navy-dark bg-brand-lime hover:bg-white disabled:bg-slate-800 transition"
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
