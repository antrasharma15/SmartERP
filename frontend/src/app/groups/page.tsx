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
  FolderOpen,
  ArrowRight
} from "lucide-react";

interface Group {
  id: string;
  company_id: string;
  name: string;
  type: 'asset' | 'liability' | 'income' | 'expense';
  parent_id: string | null;
  parent_name?: string;
  created_at: string;
}

export default function GroupsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  // Data states
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
    type: "asset" as "asset" | "liability" | "income" | "expense",
    parent_id: ""
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
    console.log("[GroupsPage] Mounting component and checking auth session...");
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.warn("[GroupsPage Warning] No active session found. Redirecting to login.");
      router.push("/login");
      return;
    }
    setUser(currentUser);

    const activeCompanyStr = localStorage.getItem("activeCompany");
    if (!activeCompanyStr) {
      console.warn("[GroupsPage Warning] No active company selected. Redirecting to companies selection.");
      router.push("/companies");
      return;
    }

    try {
      const activeCompany = JSON.parse(activeCompanyStr);
      setCompany(activeCompany);
      console.log("[GroupsPage] Active company authenticated:", activeCompany.name);
      fetchGroups(activeCompany.id);
    } catch (err) {
      console.error("[GroupsPage Error] Failed to parse active company:", err);
      localStorage.removeItem("activeCompany");
      router.push("/companies");
    }
  }, [router]);

  // Fetch groups from API
  const fetchGroups = async (companyId: string) => {
    setLoading(true);
    setError("");
    console.log(`[GroupsPage] Fetching groups list for company ID: ${companyId}`);
    try {
      const data = await apiFetch(`/groups?company_id=${companyId}`);
      const list = data.groups || [];
      setGroups(list);
      console.log(`[GroupsPage] Loaded ${list.length} groups successfully.`);
    } catch (err: any) {
      console.error("[GroupsPage Error] Failed to fetch company groups:", err);
      setError(err.message || "Failed to load group records");
    } finally {
      setLoading(false);
    }
  };

  // Filter groups based on search query
  const filteredGroups = groups.filter(group => {
    const term = searchQuery.toLowerCase();
    return (
      group.name.toLowerCase().includes(term) ||
      group.type.toLowerCase().includes(term) ||
      (group.parent_name && group.parent_name.toLowerCase().includes(term))
    );
  });

  // Keep index in bounds when list changes
  useEffect(() => {
    if (selectedRowIndex >= filteredGroups.length && filteredGroups.length > 0) {
      setSelectedRowIndex(filteredGroups.length - 1);
    }
  }, [filteredGroups.length, selectedRowIndex]);

  // Global keyboard shortcuts engine
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

      // Block defaults
      if (e.ctrlKey && ["f", "F", "g", "G", "a", "A"].includes(e.key)) {
        e.preventDefault();
      }
      if (e.altKey && ["g", "G", "a", "A"].includes(e.key)) {
        e.preventDefault();
      }

      // Escape key
      if (e.key === "Escape") {
        e.preventDefault();
        if (isModalOpen) {
          console.log("[GroupsPage Keyboard] Closing active modal.");
          setIsModalOpen(false);
          setFormError("");
        } else {
          console.log("[GroupsPage Keyboard] Returning to dashboard.");
          router.push("/dashboard");
        }
        return;
      }

      // ALT + N / ALT + G (Create Group)
      if (e.altKey && (e.key === "n" || e.key === "N" || e.key === "g" || e.key === "G")) {
        e.preventDefault();
        console.log("[GroupsPage Keyboard] Create Group shortcut triggered.");
        handleOpenCreateModal();
        return;
      }

      // ALT + A or Enter (Alter Group)
      if ((e.altKey && (e.key === "a" || e.key === "A")) || (!isModalOpen && !isTypingInInput && e.key === "Enter")) {
        e.preventDefault();
        const selectedGroup = filteredGroups[selectedRowIndex];
        if (selectedGroup) {
          console.log(`[GroupsPage Keyboard] Alter shortcut triggered for: ${selectedGroup.name}`);
          handleOpenEditModal(selectedGroup);
        } else {
          triggerToast("No group selected to alter.");
        }
        return;
      }

      // Delete Key
      if (!isModalOpen && !isTypingInInput && e.key === "Delete") {
        e.preventDefault();
        const selectedGroup = filteredGroups[selectedRowIndex];
        if (selectedGroup) {
          console.log(`[GroupsPage Keyboard] Delete shortcut triggered for: ${selectedGroup.name}`);
          handleDeleteGroup(selectedGroup.id, selectedGroup.name);
        }
        return;
      }

      // Focus Search (Ctrl + F)
      if (e.ctrlKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        console.log("[GroupsPage Keyboard] CTRL+F pressed. Focusing search bar.");
        searchInputRef.current?.focus();
        return;
      }

      // Table Arrow Key Navigation
      if (!isModalOpen && !isTypingInInput) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedRowIndex(prev => (prev + 1) % filteredGroups.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedRowIndex(prev => (prev - 1 + filteredGroups.length) % filteredGroups.length);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, filteredGroups, selectedRowIndex, router]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode("create");
    setFormData({
      id: "",
      name: "",
      type: "asset",
      parent_id: ""
    });
    setFormError("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (group: Group) => {
    setModalMode("edit");
    setFormData({
      id: group.id,
      name: group.name,
      type: group.type,
      parent_id: group.parent_id || ""
    });
    setFormError("");
    setIsModalOpen(true);
  };

  // Handle Form Submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    const { id, name, type, parent_id } = formData;
    console.log(`[GroupsPage] Submitting form. Mode: ${modalMode}, Payload:`, formData);

    if (!name.trim()) {
      setFormError("Group name is required");
      setFormLoading(false);
      return;
    }

    const payload = {
      company_id: company.id,
      name: name.trim(),
      type,
      parent_id: parent_id || null
    };

    try {
      if (modalMode === "create") {
        const response = await apiFetch("/groups", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        console.log("[GroupsPage] Create group API success:", response.group);
        triggerToast(`Group "${name.trim()}" created successfully.`);
      } else {
        const response = await apiFetch(`/groups/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        console.log("[GroupsPage] Alter group API success:", response.group);
        triggerToast(`Group "${name.trim()}" updated successfully.`);
      }
      setIsModalOpen(false);
      fetchGroups(company.id);
    } catch (err: any) {
      console.error("[GroupsPage Error] Save group request failed:", err);
      setFormError(err.message || "Operation failed. Please verify inputs.");
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Group
  const handleDeleteGroup = async (groupId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the group "${name}"?`)) {
      return;
    }
    console.log(`[GroupsPage] Deleting group ID: ${groupId}`);
    try {
      const response = await apiFetch(`/groups/${groupId}`, {
        method: "DELETE"
      });
      console.log("[GroupsPage] Deletion success:", response.group);
      triggerToast(`Group "${name}" deleted successfully.`);
      fetchGroups(company.id);
    } catch (err: any) {
      console.error("[GroupsPage Error] Deletion failed:", err);
      triggerToast(`Error: ${err.message || "Failed to delete group"}`);
    }
  };

  // Calculate stats
  const getStats = () => {
    let assetCount = 0;
    let liabilityCount = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    groups.forEach(g => {
      if (g.type === "asset") assetCount++;
      else if (g.type === "liability") liabilityCount++;
      else if (g.type === "income") incomeCount++;
      else if (g.type === "expense") expenseCount++;
    });

    return {
      assetCount,
      liabilityCount,
      incomeCount,
      expenseCount
    };
  };

  const stats = getStats();

  // Get eligible parent groups (only groups matching current type, and excluding current group ID to prevent circular references)
  const getEligibleParents = () => {
    return groups.filter(
      (g) => g.type === formData.type && g.id !== formData.id
    );
  };

  const eligibleParents = getEligibleParents();

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

      {/* Main Layout Grid */}
      <main className="flex-1 max-w-[1400px] mx-auto px-6 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Group Management Grid - 9 span */}
        <section className="lg:col-span-9 rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-6 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <FolderOpen className="w-6 h-6 text-brand-lime" />
                Account Groups Management
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Maintain groups and subgroup nesting hierarchies to categorize ledger charts of accounts.
              </p>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-brand-navy-dark bg-brand-lime hover:bg-white transition duration-200 text-xs shadow-lg shadow-brand-lime/10"
            >
              <Plus className="w-4 h-4" />
              Create Group (Alt+N)
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search group name, type or parent... (Press Ctrl+F to focus)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedRowIndex(0);
              }}
              className="w-full pl-11 pr-4 py-3 bg-brand-navy-dark/60 border border-slate-850 rounded-2xl text-slate-200 placeholder-slate-500 outline-none focus:border-brand-lime transition text-xs font-semibold"
            />
          </div>

          {/* Group Table */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-lime" />
              <p className="text-xs font-medium">Fetching accounts groups...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-slate-300 text-sm">{error}</p>
              <button
                onClick={() => fetchGroups(company.id)}
                className="px-5 py-2 bg-brand-navy-light/40 border border-slate-800 rounded-xl hover:text-white text-xs font-bold"
              >
                Retry Request
              </button>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-24 border border-dashed border-slate-800 rounded-3xl text-center space-y-4">
              <p className="text-slate-400 text-xs">No accounting groups match your search criteria.</p>
              <button
                onClick={handleOpenCreateModal}
                className="px-5 py-2 bg-brand-lime text-brand-navy-dark hover:bg-white font-bold rounded-xl text-xs transition"
              >
                Create Custom Group
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-900/50 rounded-2xl bg-brand-navy-dark/20">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                    <th className="py-3 px-4">Group Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Parent Group</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((group, idx) => {
                    const isSelected = selectedRowIndex === idx;
                    return (
                      <tr
                        key={group.id}
                        onClick={() => setSelectedRowIndex(idx)}
                        onDoubleClick={() => handleOpenEditModal(group)}
                        className={`border-b border-slate-900/40 transition duration-150 cursor-pointer ${
                          isSelected
                            ? "bg-brand-lime/10 text-brand-lime font-bold border-l-4 border-l-brand-lime"
                            : "text-slate-300 hover:bg-slate-900/30"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1.5">
                            {isSelected && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                            {group.name}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 border rounded-md text-[10px] uppercase font-semibold ${
                            group.type === "asset" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                            group.type === "liability" ? "bg-sky-500/10 border-sky-500/20 text-sky-400" :
                            group.type === "income" ? "bg-purple-500/10 border-purple-500/20 text-purple-400" :
                            "bg-rose-500/10 border-rose-500/20 text-rose-400"
                          }`}>
                            {group.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-medium">
                          {group.parent_name || <span className="text-slate-600 font-mono text-[10px]">PRIMARY</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(group);
                              }}
                              className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                              title="Alter (Alt+A)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteGroup(group.id, group.name);
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
            <span>ALT+N = Create | ALT+A = Alter | Delete = Remove | ESC = Exit</span>
          </div>
        </section>

        {/* Right Column: Sidebar Stats & Legend - 3 span */}
        <section className="lg:col-span-3 space-y-6">
          {/* Quick Statistics */}
          <div className="rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-5 shadow-2xl backdrop-blur-xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-lime flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <TrendingUp className="w-4 h-4" />
              Groups Distribution
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-900/40">
                <span className="text-slate-400">Total Groups</span>
                <span className="font-bold text-white font-mono">{groups.length}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900/40">
                <span className="text-slate-400">Asset Groups</span>
                <span className="font-bold text-emerald-400 font-mono">{stats.assetCount}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900/40">
                <span className="text-slate-400">Liability Groups</span>
                <span className="font-bold text-sky-400 font-mono">{stats.liabilityCount}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900/40">
                <span className="text-slate-400">Income Groups</span>
                <span className="font-bold text-purple-400 font-mono">{stats.incomeCount}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900/40">
                <span className="text-slate-400">Expense Groups</span>
                <span className="font-bold text-rose-400 font-mono">{stats.expenseCount}</span>
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
                <span>Create Group</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-brand-lime rounded">Alt + N</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Alter Group</span>
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
                <FolderOpen className="w-5 h-5 text-brand-lime" />
                {modalMode === "create" ? "Create Account Group" : "Alter Account Group"}
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
              {/* Group Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Group Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime transition"
                  placeholder="e.g. Indirect Expenses, Current Assets"
                />
              </div>

              {/* Group Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Group Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any, parent_id: "" })}
                  className="w-full px-4 py-2.5 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime transition cursor-pointer"
                  disabled={modalMode === "edit"} // Prevent changing type for existing group to keep child classifications intact
                >
                  <option value="asset" className="bg-brand-navy-dark">Asset</option>
                  <option value="liability" className="bg-brand-navy-dark">Liability</option>
                  <option value="income" className="bg-brand-navy-dark">Income</option>
                  <option value="expense" className="bg-brand-navy-dark">Expense</option>
                </select>
                {modalMode === "edit" && (
                  <p className="text-[10px] text-slate-500 italic mt-1">Group type cannot be altered after creation.</p>
                )}
              </div>

              {/* Parent Group */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Parent Group (Under)</label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime transition cursor-pointer"
                >
                  <option value="" className="bg-brand-navy-dark text-slate-400 font-bold">PRIMARY (No parent)</option>
                  {eligibleParents.map((parent) => (
                    <option key={parent.id} value={parent.id} className="bg-brand-navy-dark text-white">
                      {parent.name}
                    </option>
                  ))}
                </select>
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
                    "Save Group"
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
